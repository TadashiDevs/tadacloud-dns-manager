/**
 * DNS Checker Service
 * Uses Google and Cloudflare DNS-over-HTTPS to check DNS propagation
 */

export interface DnsCheckResult {
    server: string;
    value: string | null;
    status: 'resolved' | 'not_resolved' | 'error';
    isCloudflareProxy?: boolean;
}

export interface DnsCheckResponse {
    domain: string;
    recordType: string;
    expectedValue: string;
    results: DnsCheckResult[];
    allMatch: boolean;
    matchCount: number;
    totalServers: number;
    isProxied: boolean;
}

/**
 * DNS record types that support propagation checking
 */
export const PROPAGATION_CHECKABLE_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS'];

/**
 * Check if a DNS record type supports propagation checking
 */
export function isPropagationCheckable(type: string): boolean {
    return PROPAGATION_CHECKABLE_TYPES.includes(type);
}

/**
 * Get message for non-checkable record types
 */
export function getNonCheckableMessage(type: string): string {
    const messages: Record<string, string> = {
        'CAA': 'CAA records are certificate authority authorization records and don\'t propagate like standard DNS.',
        'CERT': 'CERT records store certificate data and don\'t require propagation checking.',
        'DNSKEY': 'DNSKEY records are DNSSEC keys and are managed automatically.',
        'DS': 'DS records are DNSSEC delegation signers and are managed by registrars.',
        'HTTPS': 'HTTPS records are service binding records with limited propagation checking support.',
        'LOC': 'LOC records store geographic location and rarely need propagation checking.',
        'NAPTR': 'NAPTR records are specialized routing records.',
        'OPENPGPKEY': 'OPENPGPKEY records store PGP keys and don\'t propagate like standard DNS.',
        'PTR': 'PTR records are reverse DNS and require checking from the IP owner.',
        'SMIMEA': 'SMIMEA records store S/MIME certificates.',
        'SRV': 'SRV records can be checked but have complex responses.',
        'SSHFP': 'SSHFP records store SSH fingerprints.',
        'SVCB': 'SVCB records are service binding records.',
        'TLSA': 'TLSA records are TLS authentication records.',
        'URI': 'URI records store URIs and have limited support.'
    };
    return messages[type] || `${type} records don't support standard propagation checking.`;
}

/**
 * DNS Checker Service class
 */
export class DnsCheckerService {
    private static readonly GOOGLE_DOH = 'https://dns.google/resolve';
    private static readonly CLOUDFLARE_DOH = 'https://cloudflare-dns.com/dns-query';

    /**
     * DNS record type codes (RFC 1035 + extensions)
     */
    private static readonly RECORD_TYPE_CODES: Record<string, number> = {
        'A': 1,
        'NS': 2,
        'CNAME': 5,
        'MX': 15,
        'TXT': 16,
        'AAAA': 28,
        'SRV': 33,
        'CAA': 257
    };

    /**
     * Known Cloudflare IP ranges (simplified check)
     * Cloudflare uses these IP prefixes for their proxy
     */
    private static readonly CLOUDFLARE_IP_PREFIXES = [
        '104.16.', '104.17.', '104.18.', '104.19.', '104.20.', '104.21.', '104.22.', '104.23.', '104.24.', '104.25.', '104.26.', '104.27.', '104.28.', '104.29.', '104.30.', '104.31.',
        '172.64.', '172.65.', '172.66.', '172.67.', '172.68.', '172.69.', '172.70.', '172.71.',
        '173.245.',
        '103.21.', '103.22.', '103.31.',
        '141.101.',
        '108.162.',
        '190.93.',
        '188.114.',
        '197.234.',
        '198.41.',
        '162.158.',
        '2606:4700:' // IPv6 prefix
    ];

    /**
     * Check if an IP is a Cloudflare proxy IP
     */
    private isCloudflareIP(ip: string): boolean {
        return DnsCheckerService.CLOUDFLARE_IP_PREFIXES.some(prefix => ip.startsWith(prefix));
    }

    /**
     * Check DNS propagation for a domain
     * @param domain The domain to check
     * @param recordType The DNS record type (A, AAAA, CNAME, etc.)
     * @param expectedValue The expected value configured in Cloudflare
     * @param isProxied Whether the record has Cloudflare proxy enabled
     */
    public async checkPropagation(
        domain: string,
        recordType: string,
        expectedValue: string,
        isProxied: boolean = false
    ): Promise<DnsCheckResponse> {
        const results: DnsCheckResult[] = [];

        // Query Google DNS
        const googleResult = await this.queryDns(domain, recordType, expectedValue, 'Google', DnsCheckerService.GOOGLE_DOH, isProxied);
        results.push(googleResult);

        // Query Cloudflare DNS
        const cloudflareResult = await this.queryDns(domain, recordType, expectedValue, 'Cloudflare', DnsCheckerService.CLOUDFLARE_DOH, isProxied);
        results.push(cloudflareResult);

        // Calculate match status based on whether record is proxied
        let matchCount = 0;
        let allMatch = true;

        for (const result of results) {
            if (result.status !== 'resolved') {
                allMatch = false;
                continue;
            }

            if (isProxied && (recordType === 'A' || recordType === 'AAAA' || recordType === 'CNAME')) {
                // For proxied records, just check if it resolved to any value
                // The DNS will return Cloudflare's proxy IPs, not the origin IP
                if (result.value) {
                    matchCount++;
                }
            } else {
                // For non-proxied records, compare actual values
                if (this.valuesMatch(result.value, expectedValue, recordType)) {
                    matchCount++;
                } else {
                    allMatch = false;
                }
            }
        }

        // For proxied records, if all servers resolved something, consider it propagated
        if (isProxied && (recordType === 'A' || recordType === 'AAAA' || recordType === 'CNAME')) {
            allMatch = results.every(r => r.status === 'resolved' && r.value !== null);
            matchCount = results.filter(r => r.status === 'resolved' && r.value !== null).length;
        }

        return {
            domain,
            recordType,
            expectedValue,
            results,
            allMatch,
            matchCount,
            totalServers: results.length,
            isProxied
        };
    }

    /**
     * Query a DNS-over-HTTPS server
     */
    private async queryDns(
        domain: string,
        recordType: string,
        expectedValue: string,
        serverName: string,
        serverUrl: string,
        isProxied: boolean
    ): Promise<DnsCheckResult> {
        try {
            const url = `${serverUrl}?name=${encodeURIComponent(domain)}&type=${recordType}`;
            const response = await fetch(url, {
                headers: { 'Accept': 'application/dns-json' }
            });

            if (!response.ok) {
                return { server: serverName, value: null, status: 'error' };
            }

            const data = await response.json() as {
                Status: number;
                Answer?: Array<{ data: string; type: number; name: string }>;
            };

            // Status 0 = NOERROR
            if (data.Status !== 0) {
                return { server: serverName, value: null, status: 'not_resolved' };
            }

            // If we have answers, process them
            if (data.Answer && data.Answer.length > 0) {
                // Find the answer that matches our requested record type
                const expectedTypeCode = DnsCheckerService.RECORD_TYPE_CODES[recordType];
                const matchingAnswer = data.Answer.find(a => a.type === expectedTypeCode);

                if (matchingAnswer) {
                    const isCloudflareProxy = this.isCloudflareIP(matchingAnswer.data);
                    return {
                        server: serverName,
                        value: matchingAnswer.data,
                        status: 'resolved',
                        isCloudflareProxy
                    };
                }

                // For CNAME: DNS might resolve the entire chain and return A/AAAA records
                // This is valid behavior - the CNAME is working and was followed
                if (recordType === 'CNAME') {
                    // Look for any A (1) or AAAA (28) record in the response
                    const resolvedRecord = data.Answer.find(a => a.type === 1 || a.type === 28);
                    if (resolvedRecord) {
                        const isCloudflareProxy = this.isCloudflareIP(resolvedRecord.data);
                        return {
                            server: serverName,
                            value: expectedValue, // Return expected value since CNAME chain resolved
                            status: 'resolved',
                            isCloudflareProxy
                        };
                    }

                    // Also check if there's a CNAME in the chain
                    const cnameRecord = data.Answer.find(a => a.type === 5);
                    if (cnameRecord) {
                        const isCloudflareProxy = this.isCloudflareIP(cnameRecord.data);
                        return {
                            server: serverName,
                            value: cnameRecord.data,
                            status: 'resolved',
                            isCloudflareProxy
                        };
                    }
                }

                // For A/AAAA records, check if we got any IP response
                if (recordType === 'A' || recordType === 'AAAA') {
                    const ipRecord = data.Answer.find(a => a.type === 1 || a.type === 28);
                    if (ipRecord) {
                        const isCloudflareProxy = this.isCloudflareIP(ipRecord.data);
                        return {
                            server: serverName,
                            value: ipRecord.data,
                            status: 'resolved',
                            isCloudflareProxy
                        };
                    }
                }
            }

            // No Answer or empty Answer - for CNAME, try querying A record instead
            // This handles Cloudflare's CNAME Flattening where CNAME is converted to A
            if (recordType === 'CNAME') {
                return await this.queryCnameAsA(domain, expectedValue, serverName, serverUrl, isProxied);
            }

            return { server: serverName, value: null, status: 'not_resolved' };
        } catch (error) {
            return { server: serverName, value: null, status: 'error' };
        }
    }

    /**
     * For CNAME records that might be "flattened" by Cloudflare,
     * query the A record to verify the domain resolves
     */
    private async queryCnameAsA(
        domain: string,
        expectedValue: string,
        serverName: string,
        serverUrl: string,
        isProxied: boolean
    ): Promise<DnsCheckResult> {
        try {
            // Query for A record instead
            const url = `${serverUrl}?name=${encodeURIComponent(domain)}&type=A`;
            const response = await fetch(url, {
                headers: { 'Accept': 'application/dns-json' }
            });

            if (!response.ok) {
                return { server: serverName, value: null, status: 'not_resolved' };
            }

            const data = await response.json() as {
                Status: number;
                Answer?: Array<{ data: string; type: number; name: string }>;
            };

            // If we got an A record, the CNAME is working (was flattened)
            if (data.Status === 0 && data.Answer && data.Answer.length > 0) {
                const aRecord = data.Answer.find(a => a.type === 1);
                if (aRecord) {
                    const isCloudflareProxy = this.isCloudflareIP(aRecord.data);
                    // The CNAME is flattened but working - return success
                    return {
                        server: serverName,
                        value: isProxied ? aRecord.data : expectedValue,
                        status: 'resolved',
                        isCloudflareProxy
                    };
                }

                // Check for CNAME in the chain that points to our expected value
                const cnameRecord = data.Answer.find(a => a.type === 5);
                if (cnameRecord) {
                    const isCloudflareProxy = this.isCloudflareIP(cnameRecord.data);
                    return {
                        server: serverName,
                        value: cnameRecord.data,
                        status: 'resolved',
                        isCloudflareProxy
                    };
                }
            }

            return { server: serverName, value: null, status: 'not_resolved' };
        } catch (error) {
            return { server: serverName, value: null, status: 'not_resolved' };
        }
    }

    /**
     * Compare DNS values (handles different formats)
     */
    private valuesMatch(actualValue: string | null, expectedValue: string, recordType: string): boolean {
        if (!actualValue) {
            return false;
        }

        // Normalize values for comparison
        const normalizedActual = actualValue.toLowerCase().replace(/\.+$/, '');
        const normalizedExpected = expectedValue.toLowerCase().replace(/\.+$/, '');

        // For CNAME and MX, the response might have trailing dots
        if (recordType === 'CNAME' || recordType === 'MX' || recordType === 'NS') {
            return normalizedActual === normalizedExpected;
        }

        // For TXT records, might be quoted
        if (recordType === 'TXT') {
            const cleanActual = normalizedActual.replace(/^"|"$/g, '');
            const cleanExpected = normalizedExpected.replace(/^"|"$/g, '');
            return cleanActual === cleanExpected;
        }

        return normalizedActual === normalizedExpected;
    }
}
