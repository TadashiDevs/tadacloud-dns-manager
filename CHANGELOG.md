# Changelog

All notable changes to TadaCloud DNS Manager will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2026-01-12

### Added
- **SSL/TLS Mode Management**: Control your domain's encryption settings
  - Right-click any domain → "Set SSL Mode"
  - **Automatic Mode**: Let Cloudflare manage (recommended Full)
  - **Custom Modes**: Full (Strict), Full, Flexible, Off
  - Current mode highlighted in menu
  - Real-time fetching of current SSL status

- **Cache Purge - Domain Level**: Purge entire zone cache
  - Right-click any domain → "🧹 Purge Cache (Everything)"
  - Modal confirmation dialog to prevent accidents
  - Removes ALL cached content (HTML, CSS, JS, images, etc.)
  - StatusBar feedback on success

- **Cache Purge - Subdomain Level (Smart Purge)**: Surgical cache clearing
  - Right-click any DNS record → "🧹 Purge Subdomain Cache"
  - Uses Cloudflare's `hosts` parameter for precision targeting
  - Only purges the specific hostname (e.g., `tienda.example.com`)
  - Does NOT affect other subdomains or root domain

- **New Commands**:
  - `tadacloud.setSSLMode`: Set SSL/TLS encryption mode
  - `tadacloud.purgeCacheZone`: Purge all cache for domain
  - `tadacloud.purgeCacheSubdomain`: Purge cache for specific subdomain

- **Smart Error Handling for 403 Errors**:
  - Detects missing "Cache Purge" permission
  - Shows exactly which permission is missing
  - Direct link to Cloudflare Dashboard to fix

### Changed
- **API Token Permissions**: Now requires **5 permissions** (added Cache Purge):
  - Account → Account Settings → Edit
  - Zone → Zone Settings → Edit
  - Zone → Zone → Edit
  - Zone → DNS → Edit
  - **Zone → Cache Purge → Purge** (NEW)

- Updated token instructions in extension and README
- Added new keywords: `ssl tls`, `cache purge`

### Security
- Modal confirmation dialogs prevent accidental cache purges
- Clear warnings about the impact of each operation

---

## [1.3.1] - 2025-12-29


### Added
- **Team Member Management**: Manage your Cloudflare account team directly from VS Code!
  - **Team Members Node**: New collapsible node under each account showing all team members
  - **View Members**: See member emails, roles, and status (✅ Active, ⏳ Pending, ❌ Rejected)
  - **Invite Members**: Invite new members via right-click menu
    - Support for multiple emails (comma-separated)
    - Scope selection: "Entire Account" or "Specific Domains"
    - Domain multi-select when choosing specific domains
    - Role multi-select (toggle multiple roles on/off)
    - Choose between sending invitation or adding directly
  - **Edit Permissions**: Modify member roles via right-click → "Edit Permissions"
  - **Copy Email**: Quick copy member email to clipboard
  - **Resend Invitation**: Resend email to pending members
  - **Remove Member**: Remove members from account with confirmation
  - **Refresh Members**: Right-click on "Team Members" to refresh the list

- **New Commands**:
  - `tadacloud.inviteMember`: Invite new team member(s) to account
  - `tadacloud.editMemberPermissions`: Edit member roles and permissions
  - `tadacloud.copyMemberEmail`: Copy member email to clipboard
  - `tadacloud.resendInvitation`: Resend invitation to pending member
  - `tadacloud.removeMember`: Remove member from account
  - `tadacloud.refreshMembers`: Refresh team members list

- **Fallback ID System for Reliable Role Assignment**
  - `ZONE_LEVEL_ROLE_IDS`: 13 zone-level role IDs for domain-specific permissions
  - `ACCOUNT_LEVEL_ROLE_IDS`: 38+ account-level role IDs for account-wide permissions
  - IDs extracted via reverse engineering from Cloudflare Dashboard network traffic
  - Priority Inversion Logic: Hardcoded IDs are checked BEFORE API response
  - Ensures reliable role assignment even when Cloudflare API returns incorrect IDs

### Fixed
- **Error 1006 "invalid permission group"** when inviting/editing members
  - Root cause: Cloudflare's public API returns different Permission Group IDs than the ones required by the Members API
  - Solution: Implemented fallback system using verified IDs from Cloudflare Dashboard

- **Error 400 "invalid permission group and resource group combination"** for domain-level policies
  - Root cause: Standard `policies` payload structure is rejected for certain legacy Permission Groups
  - Solution: Implemented Ad-Hoc scope structure with `meta: { adhoc: "true" }` and concatenated zone ID in scope key

### Changed
- **API Token Permissions**: Now requires 4 specific permissions for full functionality:
  - Account → Account Settings → Edit
  - Zone → Zone Settings → Edit  
  - Zone → Zone → Edit
  - Zone → DNS → Edit

- **Payload Structure for Domain Policies**: Now uses Ad-Hoc format:
  ```json
  {
    "resource_groups": [{
      "meta": { "adhoc": "true" },
      "scope": {
        "key": "com.cloudflare.api.account.zone.{ZONE_ID}",
        "objects": [{ "key": "*" }]
      }
    }]
  }
  ```

### Security
- Team member data is fetched securely via Cloudflare API
- No member data is stored locally

### Technical Notes
- This release addresses limitations in Cloudflare's public API that affect Free/Pro accounts
- The internal ID mapping ensures compatibility across all Cloudflare plan types
- Role selection UI shows appropriate roles based on scope (account vs. domain)

---

## [1.2.0] - 2025-12-23

### Added
- **Cloudflare Account ID Support**: Now requires Account ID for adding domains
  - Account ID is stored securely encrypted alongside API Token
  - Provides proper Cloudflare account identification for API calls
  
- **Cloudflare Plan Selection**: Choose between Free, Pro ($20/mo), Business ($200/mo), or Enterprise plans when adding domains
  - Free plan: Adds domain directly via API
  - Paid plans: Opens Cloudflare dashboard to complete subscription
  
- **Persistent Nameserver Copy Dialog**: After adding a domain, a persistent QuickPick stays open to copy nameservers
  - Click each nameserver to copy it individually
  - Dialog stays open even when switching to browser (`ignoreFocusOut: true`)
  - Shows domain status: 🟡 Pending or 🟢 Active
  - Includes link to registrar setup guide
  - Press ESC or click "Done" to close

- **RDAP Domain Validation**: Before adding a domain, the extension verifies it exists in global ICANN records
  - Queries `rdap.org` with 3-second timeout
  - Blocks unregistered domains with clear error message
  - Gracefully skips validation if RDAP is temporarily unavailable

### Security
- **Account ID Encryption**: The new Cloudflare Account ID is now stored encrypted in SecretStorage
  - Same security level as API Token (encrypted since v1.0.0)
  - Uses VS Code's SecretStorage (OS keychain encryption)
  - Added security notice in setup instructions

### Fixed
- **DNS Checker for Proxied records (🟠)**: Now correctly shows "Propagated" for records with Cloudflare Proxy enabled
  - Previously showed "Still Propagating" because DNS returns Cloudflare's proxy IPs instead of origin IP
  - Now detects Cloudflare IP ranges (104.16.x.x, 172.64.x.x, 172.67.x.x, etc.) and considers resolution successful
  - Shows "(CF Proxy)" indicator in results

- **DNS Checker for CNAME records**: Fixed false "Not resolved" for CNAMEs
  - Added CNAME Flattening detection - handles when Cloudflare converts CNAME to A records
  - Falls back to A record query if CNAME query returns empty (expected behavior with flattening)
  - Now correctly shows propagation status for both Proxied and DNS Only CNAMEs

- **Edit Record preselection**: Type, TTL, and Proxy Status now correctly show current values first
  - Current values appear first in the list with ✓ mark and "(current)" description

- **Open in Cloudflare URLs**: Now uses real Account ID instead of placeholder `/:account/`
  - URLs like `dash.cloudflare.com/{accountId}/{domain}/dns/records`

- **Invalid Account Identifier Error**: Fixed by using stored Cloudflare Account ID in API calls

- **Input Fields Stay Open**: Account ID and API Token fields no longer close when switching windows

### Changed
- Setup wizard now requires 3 fields: Name, Account ID, and API Token
- Updated instructions with complete API Token creation guide
- Improved notification messages for all operations
- Renamed "Migrate Domain" to "Add Domain to Cloudflare" for clarity


---

## [1.1.0] - 2025-12-18

### Added
- **DNS Checker**: Check DNS propagation status using Google and Cloudflare DNS-over-HTTPS
  - Supports A, AAAA, CNAME, MX, TXT, and NS record types
  - Shows propagation status: ✅ Propagated, ⚠️ Partially Propagated, ⏳ Still Propagating
  - Informative messages for record types that don't support propagation checking (CAA, CERT, DNSKEY, etc.)

- **Migrate Domain to Cloudflare**: Add new domains directly from VS Code
  - Automatically imports existing DNS records (jump_start)
  - Shows Cloudflare nameservers to configure at your registrar
  - Copy nameservers to clipboard
  - Link to Cloudflare's registrar setup guide

- **Support for all 21 Cloudflare DNS record types**:
  - A, AAAA, CAA, CERT, CNAME, DNSKEY, DS, HTTPS, LOC, MX, NAPTR, NS, OPENPGPKEY, PTR, SMIMEA, SRV, SSHFP, SVCB, TLSA, TXT, URI

### Changed
- Expanded record type options in Add/Edit DNS record forms
- Updated Open in Cloudflare URL to use domain name for correct redirection

---

## [1.0.1] - 2025-12-16

Same as 1.0.0 - Published to different marketplace.

---

## [1.0.0] - 2025-12-16

### Added
- **Initial Release** 🎉

- **Multi-Account Support**
  - Add multiple Cloudflare accounts
  - Secure token storage using VS Code's SecretStorage (encrypted)
  - Rename and delete accounts
  - Update API tokens

- **Domain (Zone) Management**
  - View all domains across accounts in a tree view
  - Domain status indicators: 🟢 Active, 🟡 Pending, 🔴 Moved/Deleted
  - DNS record count badges
  - Copy Zone ID to clipboard
  - Open domain in Cloudflare dashboard

- **DNS Record Management (CRUD)**
  - Create new DNS records with guided wizard
  - Edit existing records (Name, Content, TTL, Proxy)
  - Delete records with confirmation dialog
  - Toggle Cloudflare Proxy (🟠/⚪) with one click
  - Copy record content/IP to clipboard

- **Supported Record Types**
  - A, AAAA, CNAME, MX, TXT, NS, SRV, CAA

- **Tree View Interface**
  - Native VS Code sidebar integration
  - Collapsible hierarchy: Account → Domain → Records
  - Rich tooltips with record details
  - Loading and error states

- **Configuration Options**
  - Default TTL for new records
  - Default proxy status
  - Visible record types filter
  - Confirm before delete toggle
  - Show/hide record count

- **Refresh Controls**
  - Refresh all accounts
  - Refresh single account
  - Refresh single domain

---

## Links

- [GitHub Repository](https://github.com/TadashiDevs/tadacloud-dns-manager)
- [Report Issues](https://github.com/TadashiDevs/tadacloud-dns-manager/issues)
- [Cloudflare API Documentation](https://developers.cloudflare.com/api/)
