import { Member, Role, InviteMemberData, MemberStatus } from '../models/Member';
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
 * Service for managing Cloudflare account members
 */
export class MemberService {
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
     * Get all members in the account
     */
    public async getMembers(): Promise<Member[]> {
        const members: Member[] = [];
        let page = 1;
        let totalPages = 1;

        do {
            const url = `/accounts/${this.accountId}/members?page=${page}&per_page=50`;
            const response = await fetch(`${CLOUDFLARE_API_BASE}${url}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json() as CloudflareResponse<Array<{
                id: string;
                email?: string;
                user?: {
                    id: string;
                    email: string;
                    first_name?: string;
                    last_name?: string;
                    two_factor_authentication_enabled?: boolean;
                };
                status: MemberStatus;
                roles: Array<{
                    id: string;
                    name: string;
                    description: string;
                    permissions?: Record<string, { read: boolean; write: boolean }>;
                }>;
                policies?: Array<{
                    id: string;
                    access: 'allow' | 'deny';
                    permission_groups: Array<{ id: string; name: string }>;
                    resource_groups: Array<{ id: string; name?: string; scope: { key: string; objects?: Array<{ key: string }> } }>;
                }>;
            }>>;

            if (!data.success) {
                throw new Error(data.errors.map(e => e.message).join(', '));
            }

            members.push(...data.result.map(m => ({
                id: m.id,
                email: m.user?.email || m.email || 'Unknown',
                firstName: m.user?.first_name,
                lastName: m.user?.last_name,
                status: m.status,
                twoFactorEnabled: m.user?.two_factor_authentication_enabled || false,
                roles: m.roles.map(r => ({
                    id: r.id,
                    name: r.name,
                    description: r.description
                })),
                policies: m.policies?.map(p => ({
                    id: p.id,
                    access: p.access,
                    permissionGroups: p.permission_groups.map(pg => ({
                        id: pg.id,
                        name: pg.name
                    })),
                    resourceGroups: p.resource_groups.map(rg => {
                        // scope is an OBJECT, not array. Convert to our array format
                        // Extract zoneId from scope.key: "com.cloudflare.api.account.zone.ZONE_ID"
                        const scopeKey = rg.scope?.key || '';
                        let zoneId = '';
                        if (scopeKey.includes('.zone.')) {
                            const parts = scopeKey.split('.zone.');
                            if (parts.length > 1) {
                                zoneId = parts[1];
                            }
                        }

                        return {
                            id: rg.id,
                            name: rg.name || '',
                            scope: [{
                                key: scopeKey,
                                objects: rg.scope?.objects || [],
                                // Add extracted zoneId for easy access
                                zoneId: zoneId
                            }]
                        };
                    })
                })) || []
            })));

            if (data.result_info) {
                totalPages = data.result_info.total_pages;
            }
            page++;
        } while (page <= totalPages);

        return members;
    }

    /**
     * Get a specific member by ID
     */
    public async getMember(memberId: string): Promise<Member> {
        const result = await this.request<{
            id: string;
            user?: {
                id: string;
                email: string;
                first_name?: string;
                last_name?: string;
                two_factor_authentication_enabled?: boolean;
            };
            email?: string;
            status: MemberStatus;
            roles: Array<{
                id: string;
                name: string;
                description: string;
            }>;
            policies?: Array<{
                id: string;
                access: 'allow' | 'deny';
                permission_groups: Array<{ id: string; name: string }>;
                resource_groups: Array<{ id: string; name?: string; scope: { key: string; objects?: Array<{ key: string }> } }>;
            }>;
        }>(`/accounts/${this.accountId}/members/${memberId}`);

        return {
            id: result.id,
            email: result.user?.email || result.email || 'Unknown',
            firstName: result.user?.first_name,
            lastName: result.user?.last_name,
            status: result.status,
            twoFactorEnabled: result.user?.two_factor_authentication_enabled || false,
            roles: result.roles.map(r => ({
                id: r.id,
                name: r.name,
                description: r.description
            })),
            policies: result.policies?.map(p => ({
                id: p.id,
                access: p.access,
                permissionGroups: p.permission_groups.map(pg => ({
                    id: pg.id,
                    name: pg.name
                })),
                resourceGroups: p.resource_groups.map(rg => {
                    // scope is an OBJECT, not array. Extract zoneId from scope.key
                    const scopeKey = rg.scope?.key || '';
                    let zoneId = '';
                    if (scopeKey.includes('.zone.')) {
                        const parts = scopeKey.split('.zone.');
                        if (parts.length > 1) {
                            zoneId = parts[1];
                        }
                    }

                    return {
                        id: rg.id,
                        name: rg.name || '',
                        scope: [{
                            key: scopeKey,
                            objects: rg.scope?.objects || [],
                            zoneId: zoneId
                        }]
                    };
                })
            })) || []
        };
    }

    /**
     * Get all available roles for the account
     */
    public async getRoles(): Promise<Role[]> {
        const roles: Role[] = [];
        let page = 1;
        let totalPages = 1;

        do {
            const url = `/accounts/${this.accountId}/roles?page=${page}&per_page=50`;
            const response = await fetch(`${CLOUDFLARE_API_BASE}${url}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json() as CloudflareResponse<Array<{
                id: string;
                name: string;
                description: string;
                scopes?: string[];
                permissions?: Record<string, unknown>;
            }>>;

            if (!data.success) {
                throw new Error(data.errors.map(e => e.message).join(', '));
            }

            roles.push(...data.result.map(r => ({
                id: r.id,
                name: r.name,
                description: r.description
            })));

            if (data.result_info) {
                totalPages = data.result_info.total_pages;
            }
            page++;
        } while (page <= totalPages);

        return roles;
    }

    /**
     * Get all IAM permission groups for the account
     * These are different from roles and are used for domain-level policies
     */
    public async getPermissionGroups(): Promise<Array<{ id: string; name: string; scopes?: string[] }>> {
        const permissionGroups: Array<{ id: string; name: string; scopes?: string[] }> = [];
        let page = 1;
        let totalPages = 1;

        do {
            const url = `/accounts/${this.accountId}/iam/permission_groups?page=${page}&per_page=50`;
            const response = await fetch(`${CLOUDFLARE_API_BASE}${url}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json() as CloudflareResponse<Array<{
                id: string;
                name: string;
                scopes?: string[];
                meta?: { label?: string; scopes?: string; description?: string };
            }>>;

            if (!data.success) {
                return [];
            }

            permissionGroups.push(...data.result.map(pg => ({
                id: pg.id,
                name: pg.name,
                scopes: pg.scopes || (pg.meta?.scopes ? [pg.meta.scopes] : [])
            })));

            if (data.result_info) {
                totalPages = data.result_info.total_pages;
            }
            page++;
        } while (page <= totalPages);

        return permissionGroups;
    }

    /**
     * Invite a new member to the account
     * Supports both account-level roles and domain-level policies
     */
    public async inviteMember(data: InviteMemberData): Promise<Member> {
        // Build the request body based on whether we have policies or roles
        let requestBody: Record<string, unknown>;

        if (data.policies && data.policies.length > 0) {
            // Domain-level access: use policies
            requestBody = {
                email: data.email,
                status: data.status || 'pending',
                policies: data.policies
            };
        } else if (data.roles && data.roles.length > 0) {
            // Account-level access: use roles (array of STRING IDs, not objects!)
            requestBody = {
                email: data.email,
                status: data.status || 'pending',
                roles: data.roles
            };
        } else {
            throw new Error('Either roles or policies must be provided');
        }

        const result = await this.request<{
            id: string;
            user?: {
                id: string;
                email: string;
                first_name?: string;
                last_name?: string;
                two_factor_authentication_enabled?: boolean;
            };
            email?: string;
            status: MemberStatus;
            roles?: Array<{
                id: string;
                name: string;
                description: string;
            }>;
        }>(`/accounts/${this.accountId}/members`, {
            method: 'POST',
            body: JSON.stringify(requestBody)
        });

        return {
            id: result.id,
            email: result.user?.email || result.email || data.email,
            firstName: result.user?.first_name,
            lastName: result.user?.last_name,
            status: result.status,
            twoFactorEnabled: result.user?.two_factor_authentication_enabled || false,
            roles: result.roles?.map(r => ({
                id: r.id,
                name: r.name,
                description: r.description
            })) || [],
            policies: []
        };
    }
    /**
     * Update a member's roles
     */
    public async updateMember(memberId: string, roleIds: string[]): Promise<Member> {
        const result = await this.request<{
            id: string;
            user?: {
                id: string;
                email: string;
                first_name?: string;
                last_name?: string;
                two_factor_authentication_enabled?: boolean;
            };
            email?: string;
            status: MemberStatus;
            roles: Array<{
                id: string;
                name: string;
                description: string;
            }>;
        }>(`/accounts/${this.accountId}/members/${memberId}`, {
            method: 'PUT',
            body: JSON.stringify({
                roles: roleIds.map(id => ({ id }))
            })
        });

        return {
            id: result.id,
            email: result.user?.email || result.email || 'Unknown',
            firstName: result.user?.first_name,
            lastName: result.user?.last_name,
            status: result.status,
            twoFactorEnabled: result.user?.two_factor_authentication_enabled || false,
            roles: result.roles.map(r => ({
                id: r.id,
                name: r.name,
                description: r.description
            })),
            policies: []
        };
    }

    /**
     * Update a member's permissions using policies endpoint
     * Supports both standard and legacy scope formats
     */
    public async updateMemberPolicies(
        memberId: string,
        permissionGroupIds: string[],
        zoneIds: string[],
        useLegacyFormat: boolean = false
    ): Promise<Member> {
        // Build resource_groups based on format
        let resourceGroups;

        if (useLegacyFormat) {
            // LEGACY/AD-HOC format: zone ID is part of the key, objects is [{ key: '*' }]
            // Critical: meta: { adhoc: 'true' } is required for Cloudflare to accept this format
            resourceGroups = zoneIds.map(zoneId => ({
                meta: { adhoc: 'true' },
                scope: {
                    key: `com.cloudflare.api.account.zone.${zoneId}`,
                    objects: [{ key: '*' }]
                }
            }));
        } else {
            // Standard format: key is static, objects contains zone IDs
            resourceGroups = [{
                scope: {
                    key: 'com.cloudflare.api.account.zone',
                    objects: zoneIds.map(id => ({ key: id }))
                }
            }];
        }

        const payload = {
            policies: [{
                access: 'allow',
                permission_groups: permissionGroupIds.map(id => ({ id })),
                resource_groups: resourceGroups
            }]
        };

        const result = await this.request<{
            id: string;
            user?: {
                id: string;
                email: string;
                first_name?: string;
                last_name?: string;
                two_factor_authentication_enabled?: boolean;
            };
            status: MemberStatus;
            roles?: Array<{
                id: string;
                name: string;
                description: string;
            }>;
        }>(`/accounts/${this.accountId}/members/${memberId}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });

        return {
            id: result.id,
            email: result.user?.email || '',
            firstName: result.user?.first_name,
            lastName: result.user?.last_name,
            status: result.status,
            twoFactorEnabled: result.user?.two_factor_authentication_enabled || false,
            roles: result.roles?.map(r => ({
                id: r.id,
                name: r.name,
                description: r.description
            })) || [],
            policies: []
        };
    }

    /**
     * Remove a member from the account
     */
    public async removeMember(memberId: string): Promise<void> {
        await this.request<{ id: string }>(`/accounts/${this.accountId}/members/${memberId}`, {
            method: 'DELETE'
        });
    }

    /**
     * Resend invitation to a pending member
     * Note: Cloudflare doesn't have a direct resend endpoint, 
     * so we remove and re-add the member
     */
    public async resendInvitation(memberId: string, email: string, roleIds: string[]): Promise<Member> {
        // First remove the existing invitation
        await this.removeMember(memberId);

        // Then re-invite
        return this.inviteMember({
            email,
            roles: roleIds,
            status: 'pending'
        });
    }

    /**
     * Map UI role names to API role names
     * Domain roles in UI have "Domain" prefix, but API uses generic names
     */
    public static readonly DOMAIN_ROLE_MAP: Record<string, string> = {
        // Domain roles -> API role names
        'Domain Administrator': 'Administrator',
        'Domain Administrator Read Only': 'Administrator Read Only',
        'Domain API Gateway': 'Domain API Gateway',
        'Domain API Gateway Read': 'Domain API Gateway Read',
        'Domain DNS': 'DNS',
        'Domain Page Shield': 'Page Shield',
        'Domain Page Shield Read': 'Page Shield Read',
        'Domain Waiting Room Admin': 'Waiting Room Admin',
        'Domain Waiting Room Read': 'Waiting Room Read',
        'Zone Versioning': 'Zone Versioning',
        'Zone Versioning Read': 'Zone Versioning Read',
        'Bot Management': 'Bot Management',
        'Cache Domain Purge': 'Cache Domain Purge',
    };

    /**
     * ZONE-LEVEL Role IDs (require domain selection + policies with Ad-Hoc structure)
     * These are used when inviting/editing members with domain-specific access
     */
    public static readonly ZONE_LEVEL_ROLE_IDS: Record<string, string> = {
        'Domain DNS': '132c52e7e6654b999c183cfcbafd37d7',
        'Domain Administrator': 'a5e5061418ea445fbba04aac57f359a8',
        'Domain Administrator Read Only': '98d2b0c4bd3b4a2c842fcd2a81273ee9',
        'Domain API Gateway': '7276dc8e5e31412297b6075e614a67dd',
        'Domain API Gateway Read': '4757eb7bd807416ba3164efaae1d516e',
        'Bot Management': '44befc657c1d4ec3a257d67567b432df',
        'Cache Domain Purge': 'e713d034437c4c6d936daf981f29bf88',
        'Domain Page Shield': '6d5a15bbb1c84d6e8d74ea65de18dfde',
        'Domain Page Shield Read': '1b6236cae9ec4156aaae43758d7c01cb',
        'Domain Waiting Room Admin': '799e2611cdbe47da8ec3a5c880f301cf',
        'Domain Waiting Room Read': '2c9401002e4c48d4a1eb1240c5fc5ba7',
        'Zone Versioning': 'd6543484f53d4612a8bb577439169f72',
        'Zone Versioning Read': '01a5d978c1f44ab78951b45354107a04',
    };

    /**
     * ACCOUNT-LEVEL Role IDs (global access - use simple roles: ["ID"] array)
     * These are used when inviting members with full account access
     * Extracted from official Cloudflare API
     */
    public static readonly ACCOUNT_LEVEL_ROLE_IDS: Record<string, string> = {
        'Administrator': '05784afa30c1afe1440e79d9351c7430',
        'Administrator Read Only': 'f2b20eaa1a5d4af42b53ac16238c99c7',
        'Super Administrator - All Privileges': '33666b9c79b9a5273fc7344ff42f953d',
        'Minimal Account Access': '5c35d2bf3a545e6b7560b826c0d23c39',
        'Billing': '298ce8e7a2ba08b9d18ce0a32bb458ee',
        'Analytics': '6ddc5f80969d01105b5a0931e0079365',
        'Audit Logs Viewer': '9dfa4d1b73034f70ad896bf1c26d78f3',
        'Cache Purge': 'd1c17a97abf0aa371338074955877ba0',
        'DNS': '069fe803647ed3609e93d041d5df6050',
        'Firewall': '1963e6e3aca5ac9a7a91609a0040ab02',
        'Load Balancer': 'c61d4237ab1c08a3d11feb6bd5e91c5a',
        'Log Share': '3a170f9cfd62f321d6d835dc44bfe6dc',
        'Log Share Reader': '340113a819900e1b4beebccc2ddb32e7',
        'Cloudflare Access': '951e083054cc4f172986fc9be0aa17af',
        'Cloudflare Stream': '8b081b06f8ffef0522957fc6929cdcca',
        'Cloudflare Images': '94bedef1a0bdd311891188867727e42d',
        'Cloudflare Gateway': '10e95af809390ce236cbdcf03935e215',
        'Workers Platform Admin': '57280df9f1a5806e04f065b07bbdd17a',
        'Workers Editor': '98a33bce907b575c9607725ec26ef20a',
        'Workers Platform (Read-only)': 'e58cefd75d7adae0b761796c28815e5c',
        'Trust And Safety': '051312130d7384b97d7c4fa122eb7519',
        'Cloudflare Zero Trust': 'ef13f042efdd58f592148c035f291bfa',
        'Cloudflare Zero Trust Read Only': '156a872fa6df06e0e9b85d32afce6990',
        'Cloudflare Zero Trust PII': 'f43d556e0699e47c9188ea1973a48e24',
        'Cloudflare Zero Trust Reporting': 'b525e80fc64a4323a9ea666467d1865c',
        'API Gateway': '67ff895d0db461b61dd911232fcbc790',
        'API Gateway Read': '35956457e745b2af7331713a1ddf4fdb',
        'Cloudflare R2 Admin': '6f83464b634142ce4ac573616256096e',
        'Cloudflare R2 Read': '084b982fe42511d15feb1411e4c9ce9e',
        'HTTP Applications': '08abaa5235c2196d5f3daf457190161b',
        'HTTP Applications Read': 'ecd163368eb6c45b880362b0c098f5e1',
        'Page Shield': '344b7dd765da5a9de6230f7540cabb20',
        'Page Shield Read': '1b20b8701ab8a22f0229ff1c831a9e27',
        'Turnstile': 'd4c68d56bf2ef665eb82994199a393fd',
        'Turnstile Read': '2964cc9c4ebefdc6bf2bdbc4e106b906',
        'Zaraz Admin': 'fc67f46f32917cf9f0bdc082198cd747',
        'Zaraz Read': '69abc03715c77ae49be5e407f03d0650',
        'Magic Network Monitoring Admin': '37a46bc5222ebb5577b2efc7fc467fb4',
        'Email Security Policy Admin': '8e117fdd57cd531947dbdcfd82f7a1a1',
    };

    /**
     * Combined map for backward compatibility (prefer using specific maps above)
     */
    public static readonly KNOWN_PERMISSION_GROUPS: Record<string, string> = {
        ...MemberService.ZONE_LEVEL_ROLE_IDS,
        ...MemberService.ACCOUNT_LEVEL_ROLE_IDS,
    };

    /**
     * Find API role ID by UI role name (with fuzzy matching)
     */
    public findRoleIdByName(roles: Role[], uiRoleName: string): string | undefined {
        // First try exact match
        const exact = roles.find(r => r.name === uiRoleName);
        if (exact) return exact.id;

        // Try mapped name
        const mappedName = MemberService.DOMAIN_ROLE_MAP[uiRoleName];
        if (mappedName) {
            const mapped = roles.find(r => r.name === mappedName);
            if (mapped) return mapped.id;
        }

        // Try partial match (contains)
        const partial = roles.find(r =>
            r.name.toLowerCase().includes(uiRoleName.toLowerCase().replace('domain ', '')) ||
            uiRoleName.toLowerCase().includes(r.name.toLowerCase())
        );
        if (partial) return partial.id;

        return undefined;
    }
}
