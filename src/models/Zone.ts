/**
 * Represents a Cloudflare Zone (domain)
 */
export interface Zone {
    /** Cloudflare Zone ID */
    id: string;
    /** Domain name */
    name: string;
    /** Zone status */
    status: 'active' | 'pending' | 'initializing' | 'moved' | 'deleted' | 'deactivated';
    /** Whether the zone is paused */
    paused: boolean;
    /** Account ID this zone belongs to */
    accountId: string;
    /** Number of DNS records (optional, for display) */
    recordCount?: number;
}

/**
 * Zone status display configuration
 */
export const ZoneStatusIcons: Record<Zone['status'], string> = {
    'active': '🟢',
    'pending': '🟡',
    'initializing': '🟡',
    'moved': '🔴',
    'deleted': '🔴',
    'deactivated': '🔴'
};
