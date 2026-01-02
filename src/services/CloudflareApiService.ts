import { Zone, DnsRecord, CreateDnsRecordData, UpdateDnsRecordData } from '../models';
import { CLOUDFLARE_API_BASE } from '../utils';

/**
 * Response structure from Cloudflare API
 */
interface CloudflareResponse<T> {
    success: boolean;
    errors: Array<{ code: number; message: string }>;
    messages: string[];
    result: T;
    result_info?: {
        page: number;
        per_page: number;
        total_count: number;
        total_pages: number;
    };
}

/**
 * Service for interacting with Cloudflare API v4
 * Uses native fetch (Node 18+)
 */
export class CloudflareApiService {
    private token: string;
    private accountId: string;

    constructor(token: string, accountId: string) {
        this.token = token;
        this.accountId = accountId;
    }

    /**
     * Make an authenticated request to Cloudflare API
     */
    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${CLOUDFLARE_API_BASE}${endpoint}`;

        const response = await fetch(url, {
            ...options,
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        const data = await response.json() as CloudflareResponse<T>;

        if (!data.success) {
            const errorMessage = data.errors.map(e => e.message).join(', ') || 'Unknown error';
            throw new Error(`Cloudflare API Error: ${errorMessage}`);
        }

        return data.result;
    }

    /**
     * Verify API token is valid by trying to list zones
     * This is more reliable than /user/tokens/verify because:
     * 1. It tests the actual permissions we need (Zone.Read)
     * 2. Some token types don't support the verify endpoint
     */
    public async verifyToken(): Promise<boolean> {
        try {
            // Try to list zones - if this works, the token is valid
            const url = `${CLOUDFLARE_API_BASE}/zones?per_page=1`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json() as CloudflareResponse<unknown[]>;

            return data.success;
        } catch {
            return false;
        }
    }

    /**
     * Get all zones (domains) for the account
     */
    public async getZones(): Promise<Zone[]> {
        const zones: Zone[] = [];
        let page = 1;
        let totalPages = 1;

        do {
            const url = `/zones?page=${page}&per_page=50`;
            const response = await fetch(`${CLOUDFLARE_API_BASE}${url}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json() as CloudflareResponse<Array<{
                id: string;
                name: string;
                status: Zone['status'];
                paused: boolean;
                account: { id: string };
            }>>;

            if (!data.success) {
                throw new Error(data.errors.map(e => e.message).join(', '));
            }

            zones.push(...data.result.map(z => ({
                id: z.id,
                name: z.name,
                status: z.status,
                paused: z.paused,
                accountId: this.accountId
            })));

            if (data.result_info) {
                totalPages = data.result_info.total_pages;
            }
            page++;
        } while (page <= totalPages);

        return zones;
    }

    /**
     * Get DNS records for a zone
     */
    public async getDnsRecords(zoneId: string): Promise<DnsRecord[]> {
        const records: DnsRecord[] = [];
        let page = 1;
        let totalPages = 1;

        do {
            const url = `/zones/${zoneId}/dns_records?page=${page}&per_page=100`;
            const response = await fetch(`${CLOUDFLARE_API_BASE}${url}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json() as CloudflareResponse<Array<{
                id: string;
                type: DnsRecord['type'];
                name: string;
                content: string;
                ttl: number;
                proxied: boolean;
                proxiable: boolean;
                priority?: number;
                comment?: string;
                created_on?: string;
                modified_on?: string;
            }>>;

            if (!data.success) {
                throw new Error(data.errors.map(e => e.message).join(', '));
            }

            records.push(...data.result.map(r => ({
                id: r.id,
                zoneId: zoneId,
                accountId: this.accountId,
                type: r.type,
                name: r.name,
                content: r.content,
                ttl: r.ttl,
                proxied: r.proxied,
                proxiable: r.proxiable,
                priority: r.priority,
                comment: r.comment,
                createdOn: r.created_on,
                modifiedOn: r.modified_on
            })));

            if (data.result_info) {
                totalPages = data.result_info.total_pages;
            }
            page++;
        } while (page <= totalPages);

        return records;
    }

    /**
     * Create a new DNS record
     */
    public async createDnsRecord(zoneId: string, data: CreateDnsRecordData): Promise<DnsRecord> {
        const result = await this.request<{
            id: string;
            type: DnsRecord['type'];
            name: string;
            content: string;
            ttl: number;
            proxied: boolean;
            proxiable: boolean;
            priority?: number;
        }>(`/zones/${zoneId}/dns_records`, {
            method: 'POST',
            body: JSON.stringify(data)
        });

        return {
            id: result.id,
            zoneId: zoneId,
            accountId: this.accountId,
            type: result.type,
            name: result.name,
            content: result.content,
            ttl: result.ttl,
            proxied: result.proxied,
            proxiable: result.proxiable,
            priority: result.priority
        };
    }

    /**
     * Update an existing DNS record
     */
    public async updateDnsRecord(
        zoneId: string,
        recordId: string,
        data: UpdateDnsRecordData
    ): Promise<DnsRecord> {
        const result = await this.request<{
            id: string;
            type: DnsRecord['type'];
            name: string;
            content: string;
            ttl: number;
            proxied: boolean;
            proxiable: boolean;
            priority?: number;
        }>(`/zones/${zoneId}/dns_records/${recordId}`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });

        return {
            id: result.id,
            zoneId: zoneId,
            accountId: this.accountId,
            type: result.type,
            name: result.name,
            content: result.content,
            ttl: result.ttl,
            proxied: result.proxied,
            proxiable: result.proxiable,
            priority: result.priority
        };
    }

    /**
     * Delete a DNS record
     */
    public async deleteDnsRecord(zoneId: string, recordId: string): Promise<void> {
        await this.request<{ id: string }>(`/zones/${zoneId}/dns_records/${recordId}`, {
            method: 'DELETE'
        });
    }

    /**
     * Toggle proxy status for a DNS record
     */
    public async toggleProxy(zoneId: string, recordId: string, proxied: boolean): Promise<DnsRecord> {
        return this.updateDnsRecord(zoneId, recordId, { proxied });
    }

    /**
     * Get DNS record count for a zone
     */
    public async getDnsRecordCount(zoneId: string): Promise<number> {
        const url = `/zones/${zoneId}/dns_records?per_page=1`;
        const response = await fetch(`${CLOUDFLARE_API_BASE}${url}`, {
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json() as CloudflareResponse<unknown[]>;

        if (!data.success) {
            return 0;
        }

        return data.result_info?.total_count ?? 0;
    }



    /**
     * Add a new zone (domain) to Cloudflare
     * This will import existing DNS records and assign Cloudflare nameservers
     */
    public async addZone(domainName: string): Promise<{
        id: string;
        name: string;
        status: string;
        nameServers: string[];
        originalNameServers: string[];
    }> {
        try {

            const url = `${CLOUDFLARE_API_BASE}/zones`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: domainName,
                    account: { id: this.accountId }, // Use stored Cloudflare Account ID
                    jump_start: true // Auto-import existing DNS records
                })
            });

            // Always try to parse the response body
            let data: any;

            try {
                data = await response.json();
            } catch {
                // If we can't parse JSON, throw HTTP error
                throw new Error(`HTTP_ERROR:${response.status}:${response.statusText}`);
            }

            // Check for Cloudflare API errors
            if (!data.success) {
                // Check if errors array exists and has items
                if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
                    const cfError = data.errors[0];
                    const errorCode = cfError.code || 0;
                    const errorMessage = cfError.message || 'Unknown error';
                    throw new Error(`CF_ERROR:${errorCode}:${errorMessage}`);
                } else {
                    // No specific error, check for messages
                    const messages = data.messages?.join(', ') || 'Unknown Cloudflare error';
                    throw new Error(`CF_ERROR:0:${messages}`);
                }
            }

            // Verify result exists
            if (!data.result) {
                throw new Error('CF_ERROR:0:No result returned from Cloudflare');
            }

            return {
                id: data.result.id,
                name: data.result.name,
                status: data.result.status,
                nameServers: data.result.name_servers || [],
                originalNameServers: data.result.original_name_servers || []
            };
        } catch (error) {
            // Re-throw the error as-is
            throw error;
        }
    }

    /**
     * Get zone status and details
     */
    public async getZoneStatus(zoneId: string): Promise<{
        status: string;
        nameServers: string[];
    }> {
        const result = await this.request<{
            status: string;
            name_servers: string[];
        }>(`/zones/${zoneId}`);

        return {
            status: result.status,
            nameServers: result.name_servers || []
        };
    }
}

