/**
 * Validates an IPv4 address
 */
export function isValidIPv4(ip: string): boolean {
    const pattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return pattern.test(ip);
}

/**
 * Validates an IPv6 address
 */
export function isValidIPv6(ip: string): boolean {
    const pattern = /^(?:[a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}$|^::(?:[a-fA-F0-9]{1,4}:){0,6}[a-fA-F0-9]{1,4}$|^(?:[a-fA-F0-9]{1,4}:){1,7}:$|^(?:[a-fA-F0-9]{1,4}:){0,6}::(?:[a-fA-F0-9]{1,4}:){0,5}[a-fA-F0-9]{1,4}$/;
    return pattern.test(ip);
}

/**
 * Validates a domain name
 */
export function isValidDomain(domain: string): boolean {
    const pattern = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
    return pattern.test(domain);
}

/**
 * Validates a subdomain/hostname
 */
export function isValidHostname(hostname: string): boolean {
    if (hostname === '@') {
        return true;
    }
    const pattern = /^(?:[a-zA-Z0-9_](?:[a-zA-Z0-9_-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9_](?:[a-zA-Z0-9_-]{0,61}[a-zA-Z0-9])?$/;
    return pattern.test(hostname);
}

/**
 * Validates a Cloudflare API token format
 */
export function isValidApiToken(token: string): boolean {
    // Cloudflare API tokens are typically 40 characters
    return token.length >= 32 && /^[a-zA-Z0-9_-]+$/.test(token);
}

/**
 * Validates content based on record type
 */
export function validateRecordContent(type: string, content: string): { valid: boolean; error?: string } {
    switch (type) {
        case 'A':
            if (!isValidIPv4(content)) {
                return { valid: false, error: 'Invalid IPv4 address' };
            }
            break;
        case 'AAAA':
            if (!isValidIPv6(content)) {
                return { valid: false, error: 'Invalid IPv6 address' };
            }
            break;
        case 'CNAME':
        case 'NS':
            if (!isValidDomain(content)) {
                return { valid: false, error: 'Invalid domain name' };
            }
            break;
        case 'MX':
            if (!isValidDomain(content)) {
                return { valid: false, error: 'Invalid mail server domain' };
            }
            break;
        case 'TXT':
            if (content.length === 0) {
                return { valid: false, error: 'TXT record content cannot be empty' };
            }
            break;
    }
    return { valid: true };
}

/**
 * Generates a UUID v4
 */
export function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
