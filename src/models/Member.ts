/**
 * Represents a Cloudflare account member
 */
export interface Member {
    /** Member ID from Cloudflare */
    id: string;
    /** Member's email address */
    email: string;
    /** Member's first name (if available) */
    firstName?: string;
    /** Member's last name (if available) */
    lastName?: string;
    /** Member status: accepted, pending, rejected */
    status: MemberStatus;
    /** Whether 2FA is enabled for this member */
    twoFactorEnabled: boolean;
    /** Whether the member has API access */
    apiAccessEnabled?: boolean;
    /** Roles assigned to this member (legacy format) */
    roles: Role[];
    /** Policies assigned to this member (new format) */
    policies: MemberPolicy[];
}

/**
 * Member status
 */
export type MemberStatus = 'accepted' | 'pending' | 'rejected';

/**
 * Cloudflare Role
 */
export interface Role {
    /** Role ID */
    id: string;
    /** Role name */
    name: string;
    /** Role description */
    description: string;
    /** Role permissions (optional, detailed breakdown) */
    permissions?: RolePermissions;
}

/**
 * Role permissions breakdown
 */
export interface RolePermissions {
    analytics?: PermissionLevel;
    billing?: PermissionLevel;
    cachePurge?: PermissionLevel;
    dns?: PermissionLevel;
    dnsRecords?: PermissionLevel;
    lb?: PermissionLevel;
    logs?: PermissionLevel;
    organization?: PermissionLevel;
    ssl?: PermissionLevel;
    waf?: PermissionLevel;
    zoneSettings?: PermissionLevel;
    zones?: PermissionLevel;
}

/**
 * Permission level for a specific resource
 */
export interface PermissionLevel {
    read: boolean;
    write: boolean;
}

/**
 * Member policy (new Cloudflare format)
 */
export interface MemberPolicy {
    /** Policy ID */
    id: string;
    /** Access type: allow or deny */
    access: 'allow' | 'deny';
    /** Permission groups in this policy */
    permissionGroups: PermissionGroup[];
    /** Resource groups this policy applies to */
    resourceGroups: ResourceGroup[];
}

/**
 * Permission group within a policy
 */
export interface PermissionGroup {
    /** Permission group ID */
    id: string;
    /** Permission group name (e.g., "Zone Read", "DNS Edit") */
    name: string;
    /** Metadata */
    meta?: Record<string, string>;
}

/**
 * Resource group defining scope of permissions
 */
export interface ResourceGroup {
    /** Resource group ID */
    id: string;
    /** Resource group name */
    name: string;
    /** Scope of resources */
    scope: ResourceScope[];
    /** Metadata */
    meta?: Record<string, string>;
}

/**
 * Resource scope definition
 */
export interface ResourceScope {
    /** Key identifying the resource type (e.g., "com.cloudflare.api.account.zone.ZONE_ID") */
    key: string;
    /** Specific objects within this scope */
    objects?: Array<{ key: string }>;
    /** Extracted zone ID from the key (if scope is for a zone) */
    zoneId?: string;
}

/**
 * Data for inviting a new member
 */
export interface InviteMemberData {
    /** Email address of the member to invite */
    email: string;
    /** Role IDs to assign (for account-level access) */
    roles?: string[];
    /** Status: 'accepted' for direct add, 'pending' for invitation */
    status?: 'accepted' | 'pending';
    /** Policies to assign (for domain-level/granular permissions) */
    policies?: Array<{
        access: 'allow';
        permission_groups: Array<{ id: string }>;
        resource_groups: Array<{
            meta?: { adhoc: string };
            scope: {
                key: string;
                objects: Array<{ key: string }>;
            };
        }>;
    }>;
}

/**
 * Account-level role definitions (for access to entire account)
 */
export const ACCOUNT_ROLES: Array<{ name: string; description: string }> = [
    { name: 'Super Administrator - All Privileges', description: 'Can edit any Cloudflare setting, make purchases, update billing, and manage memberships' },
    { name: 'Minimal Account Access', description: 'Can view account, and nothing else' },
    { name: 'Administrator', description: 'Can access the full account and edit subscriptions. Cannot manage memberships nor billing profile' },
    { name: 'Administrator Read Only', description: 'Can access the full account in read only mode' },
    { name: 'AI Search (Read-only)', description: 'Grants access to reading data from AI Search' },
    { name: 'AI Search Admin', description: 'Can create, read, update, delete and run AI inferences in AI Search' },
    { name: 'API Gateway', description: 'Grants full access to API Gateway (including API Shield) for all domains in an account' },
    { name: 'API Gateway Read', description: 'Grants read access to API Gateway (including API Shield) for all domains in an account' },
    { name: 'Analytics', description: 'Can read Analytics' },
    { name: 'Application Security Reports Read', description: 'Can read Application Security Reports' },
    { name: 'Audit Logs Viewer', description: 'Can view Audit Logs' },
    { name: 'Billing', description: 'Can edit the account\'s billing profile and subscriptions' },
    { name: 'Bot Management (Account-Wide)', description: 'Can edit Bot Management Configuration for all domains on an account' },
    { name: 'Brand Protection', description: 'Grants access to abuse reports and brand protection' },
    { name: 'Cache Purge', description: 'Can purge the edge cache' },
    { name: 'Cloudchamber Admin', description: 'Can manage Cloudchamber deployments' },
    { name: 'Cloudchamber Admin Read Only', description: 'Can manage Cloudchamber deployments in read only mode' },
    { name: 'Cloudflare Access', description: 'Can edit Cloudflare Access' },
    { name: 'Cloudflare CASB', description: 'Can edit Cloudflare CASB' },
    { name: 'Cloudflare CASB Read', description: 'Can read Cloudflare CASB' },
    { name: 'Cloudflare DEX', description: 'Can edit Cloudflare DEX' },
    { name: 'Cloudflare Gateway', description: 'Can edit Cloudflare Gateway and read Access' },
    { name: 'Cloudflare Images', description: 'Can edit Cloudflare Images assets' },
    { name: 'Cloudflare R2 Admin', description: 'Can edit R2 buckets, objects, warehouses, and associated configurations' },
    { name: 'Cloudflare R2 Read', description: 'Can read R2 buckets, objects, warehouses and associated configurations' },
    { name: 'Cloudflare Stream', description: 'Can edit Cloudflare Stream media' },
    { name: 'Cloudflare Zero Trust', description: 'Can edit Cloudflare Zero Trust' },
    { name: 'Cloudflare Zero Trust PII', description: 'Can access Cloudflare Zero Trust PII' },
    { name: 'Cloudflare Zero Trust Read Only', description: 'Can access Cloudflare for Zero Trust read only mode' },
    { name: 'Cloudflare Zero Trust Reporting', description: 'Can access Cloudflare for Zero Trust reporting data' },
    { name: 'Cloudflare Zero Trust Secure DNS Locations Write', description: 'Can read any DNS Location data in teams but only edit secure DNS Locations' },
    { name: 'Cloudforce One Admin', description: 'Grants write access to Cloudforce One' },
    { name: 'Cloudforce One Read', description: 'Grants read access to Cloudforce One' },
    { name: 'Connectivity Directory Admin', description: 'Can view, edit, create, and delete Connectivity Directory Services' },
    { name: 'Connectivity Directory Bind', description: 'Can read, list, and bind to Connectivity Directory services' },
    { name: 'Connectivity Directory Read', description: 'Can view Connectivity Directory services and Cloudflare Tunnels' },
    { name: 'DNS', description: 'Can edit DNS records' },
    { name: 'Email Configuration Admin', description: 'Write access to all of Email Security, except for mail preview, raw email, on-demand reports' },
    { name: 'Email Integration Admin', description: 'Write access to Email Security account integration only' },
    { name: 'Email Security Analyst', description: 'Read access to all of Email Security including Settings, and can also action emails' },
    { name: 'Email Security Policy Admin', description: 'Write access to Email Security policies' },
    { name: 'Email Security Readonly', description: 'Read access to all of Email Security, cannot see raw email or take action on emails' },
    { name: 'Email Security Reporting', description: 'Read access to Email Security Home, PhishGuard, and Submission Transparency' },
    { name: 'Firewall', description: 'Can edit WAF, IP Firewall, and Zone Lockdown settings' },
    { name: 'HTTP Applications', description: 'Grants full access to HTTP Applications' },
    { name: 'HTTP Applications Read', description: 'Grants read-only access to HTTP Applications' },
    { name: 'Hyperdrive Admin', description: 'Can edit Hyperdrive database configurations' },
    { name: 'Hyperdrive Readonly', description: 'Can read Hyperdrive database configurations' },
    { name: 'Load Balancer', description: 'Can edit Load Balancing resources such as Load Balancers, Monitors, Pools, and Health Checks' },
    { name: 'Load Balancing Account Read', description: 'Can read Load Balancing resources' },
    { name: 'Log Share', description: 'Can edit Log Share configuration' },
    { name: 'Log Share Reader', description: 'Can read Enterprise Log Share' },
    { name: 'Magic Network Monitoring', description: 'Can view and edit MNM configuration' },
    { name: 'Magic Network Monitoring Admin', description: 'Can view, edit, create, and delete MNM configuration' },
    { name: 'Magic Network Monitoring Read-Only', description: 'Can view MNM configuration' },
    { name: 'Network Services Read (Magic)', description: 'Grants read access to conduit-api tunnels and routes' },
    { name: 'Network Services Write (Magic)', description: 'Grants write access to conduit-api tunnels and routes' },
    { name: 'Page Shield', description: 'Grants write access to Page Shield for all domains in account' },
    { name: 'Page Shield Read', description: 'Grants read access to Page Shield across the whole account' },
    { name: 'Realtime', description: 'Grants access to Realtime configuration excluding sensitive data' },
    { name: 'Realtime Admin', description: 'Grants admin access to Realtime configuration' },
    { name: 'SSL/TLS, Caching, Performance, Page Rules, and Customization', description: 'Can edit most Cloudflare settings except for DNS and Firewall' },
    { name: 'Secrets Store Admin', description: 'Can perform all CRUD actions on a Secret from the Secrets Store' },
    { name: 'Secrets Store Deployer', description: 'Can deploy Secrets from the Secrets Store' },
    { name: 'Secrets Store Reporter', description: 'Can list all Secrets from the Secrets Store' },
    { name: 'Trust and Safety', description: 'Grants access to view and request reviews for blocks on Dashboard' },
    { name: 'Turnstile', description: 'Grants full access to Turnstile' },
    { name: 'Turnstile Read', description: 'Grants read access to Turnstile' },
    { name: 'Vectorize Admin', description: 'Can edit Vectorize database configurations' },
    { name: 'Vectorize Readonly', description: 'Can read Vectorize database configurations' },
    { name: 'Waiting Room Admin', description: 'Can edit waiting rooms configuration' },
    { name: 'Waiting Room Read', description: 'Can read waiting rooms configuration' },
    { name: 'Workers Editor', description: 'Can use the workers editor' },
    { name: 'Workers Platform (Read-only)', description: 'Can read all resources in the Workers Platform' },
    { name: 'Workers Platform Admin', description: 'Can create, read, update and delete all resources in the Workers Platform' },
    { name: 'Zaraz Admin', description: 'Can edit and publish Zaraz configuration' },
    { name: 'Zaraz Edit', description: 'Can edit Zaraz configuration' },
    { name: 'Zaraz Readonly', description: 'Can read Zaraz configuration' },
    { name: 'Zone Versioning (Account-Wide)', description: 'Can view and edit Zone Versioning for all domains in account' },
    { name: 'Zone Versioning Read (Account-Wide)', description: 'Can view Zone Versioning for all domains in account' }
];

/**
 * Domain-level role definitions (for access to specific domains only)
 */
export const DOMAIN_ROLES: Array<{ name: string; description: string }> = [
    { name: 'Domain Administrator', description: 'Grants full access to zones in an account, as well as account-wide Firewall, Access, and Worker resources' },
    { name: 'Domain Administrator Read Only', description: 'Grants read-only access to zones in an account' },
    { name: 'Bot Management', description: 'Can edit a zone\'s Bot Management Configuration' },
    { name: 'Cache Domain Purge', description: 'Can purge the edge cache for a specific domain' },
    { name: 'Domain API Gateway', description: 'Grants full access to API Gateway (including API Shield)' },
    { name: 'Domain API Gateway Read', description: 'Grants read access to API Gateway (including API Shield)' },
    { name: 'Domain DNS', description: 'Grants access to edit DNS settings for zones in an account' },
    { name: 'Domain Page Shield', description: 'Grants write access to Page Shield for domain' },
    { name: 'Domain Page Shield Read', description: 'Grants read access to Page Shield for domain' },
    { name: 'Domain Waiting Room Admin', description: 'Can edit waiting rooms configuration' },
    { name: 'Domain Waiting Room Read', description: 'Can read waiting rooms configuration' },
    { name: 'Zone Versioning', description: 'Grants full access to Zone Versioning' },
    { name: 'Zone Versioning Read', description: 'Grants read-only access to Zone Versioning' }
];

/**
 * Get status icon for member
 */
export function getMemberStatusIcon(status: MemberStatus): string {
    switch (status) {
        case 'accepted': return '✅';
        case 'pending': return '⏳';
        case 'rejected': return '❌';
        default: return '❓';
    }
}
