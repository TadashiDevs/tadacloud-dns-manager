/**
 * DNS Record types supported by Cloudflare (all 21 types)
 */
export type DnsRecordType =
    | 'A' | 'AAAA' | 'CAA' | 'CERT' | 'CNAME' | 'DNSKEY' | 'DS'
    | 'HTTPS' | 'LOC' | 'MX' | 'NAPTR' | 'NS' | 'OPENPGPKEY' | 'PTR'
    | 'SMIMEA' | 'SRV' | 'SSHFP' | 'SVCB' | 'TLSA' | 'TXT' | 'URI';

/**
 * Represents a DNS Record in Cloudflare
 */
export interface DnsRecord {
    /** Cloudflare record ID */
    id: string;
    /** Zone ID this record belongs to */
    zoneId: string;
    /** Account ID (for reference) */
    accountId: string;
    /** Record type */
    type: DnsRecordType;
    /** Record name (e.g., "www" or "@" for root) */
    name: string;
    /** Record content (IP, domain, text, etc.) */
    content: string;
    /** TTL in seconds (1 = automatic) */
    ttl: number;
    /** Whether Cloudflare proxy is enabled */
    proxied: boolean;
    /** Whether this record type supports proxying */
    proxiable: boolean;
    /** Priority (for MX, SRV records) */
    priority?: number;
    /** Record comment */
    comment?: string;
    /** Creation date */
    createdOn?: string;
    /** Last modified date */
    modifiedOn?: string;
}

/**
 * Data required to create a new DNS record
 */
export interface CreateDnsRecordData {
    type: DnsRecordType;
    name: string;
    content: string;
    ttl: number;
    proxied?: boolean;
    priority?: number;
    comment?: string;
}

/**
 * Data for updating an existing DNS record
 */
export interface UpdateDnsRecordData {
    type?: DnsRecordType;
    name?: string;
    content?: string;
    ttl?: number;
    proxied?: boolean;
    priority?: number;
    comment?: string;
}

/**
 * Record types that support Cloudflare proxy
 */
export const PROXIABLE_RECORD_TYPES: DnsRecordType[] = ['A', 'AAAA', 'CNAME'];

/**
 * Check if a record type supports proxying
 */
export function isProxiable(type: DnsRecordType): boolean {
    return PROXIABLE_RECORD_TYPES.includes(type);
}
