/**
 * Represents a Cloudflare account stored in the extension
 */
export interface Account {
    /** Unique identifier for the account (UUID) - internal use */
    id: string;
    /** User-friendly name for the account */
    name: string;
    /** Cloudflare Account ID (from Cloudflare Dashboard) */
    cloudflareAccountId: string;
}

/**
 * Account data stored in SecretStorage (includes token)
 */
export interface AccountWithToken extends Account {
    /** API token for Cloudflare API authentication */
    token: string;
}
