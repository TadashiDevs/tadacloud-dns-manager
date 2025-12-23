/**
 * Cloudflare API base URL
 */
export const CLOUDFLARE_API_BASE = 'https://api.cloudflare.com/client/v4';

/**
 * TTL options for DNS records
 */
export const TTL_OPTIONS = [
    { label: 'Auto', value: 1 },
    { label: '1 minute', value: 60 },
    { label: '5 minutes', value: 300 },
    { label: '1 hour', value: 3600 },
    { label: '1 day', value: 86400 }
] as const;

/**
 * DNS Record type options (all 21 Cloudflare supported types)
 */
export const RECORD_TYPE_OPTIONS = [
    { label: 'A - IPv4 Address', value: 'A' },
    { label: 'AAAA - IPv6 Address', value: 'AAAA' },
    { label: 'CAA - Certificate Authority Authorization', value: 'CAA' },
    { label: 'CERT - Certificate', value: 'CERT' },
    { label: 'CNAME - Canonical Name', value: 'CNAME' },
    { label: 'DNSKEY - DNS Key', value: 'DNSKEY' },
    { label: 'DS - Delegation Signer', value: 'DS' },
    { label: 'HTTPS - HTTPS Service Binding', value: 'HTTPS' },
    { label: 'LOC - Location', value: 'LOC' },
    { label: 'MX - Mail Exchange', value: 'MX' },
    { label: 'NAPTR - Naming Authority Pointer', value: 'NAPTR' },
    { label: 'NS - Name Server', value: 'NS' },
    { label: 'OPENPGPKEY - OpenPGP Key', value: 'OPENPGPKEY' },
    { label: 'PTR - Pointer', value: 'PTR' },
    { label: 'SMIMEA - S/MIME Certificate', value: 'SMIMEA' },
    { label: 'SRV - Service', value: 'SRV' },
    { label: 'SSHFP - SSH Fingerprint', value: 'SSHFP' },
    { label: 'SVCB - Service Binding', value: 'SVCB' },
    { label: 'TLSA - TLS Authentication', value: 'TLSA' },
    { label: 'TXT - Text Record', value: 'TXT' },
    { label: 'URI - Uniform Resource Identifier', value: 'URI' }
] as const;

/**
 * Extension configuration keys
 */
export const CONFIG_KEYS = {
    DEFAULT_TTL: 'tadacloud-dns-manager.defaultTTL',
    DEFAULT_PROXY_ENABLED: 'tadacloud-dns-manager.defaultProxyEnabled',
    VISIBLE_RECORD_TYPES: 'tadacloud-dns-manager.visibleRecordTypes',
    CONFIRM_BEFORE_DELETE: 'tadacloud-dns-manager.confirmBeforeDelete',
    SHOW_RECORD_COUNT: 'tadacloud-dns-manager.showRecordCount'
} as const;

/**
 * Storage keys
 */
export const STORAGE_KEYS = {
    ACCOUNTS: 'tadacloud.accounts'
} as const;

/**
 * Proxy status indicators
 */
export const PROXY_ICONS = {
    ENABLED: '🟠',
    DISABLED: '⚪'
} as const;
