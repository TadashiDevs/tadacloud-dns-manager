<p align="center">
  <img src="resources/icons/icono-tadacloudmanager.png" alt="TadaKey 2FA Logo" width="128">
</p>

<h1 align="center">TadaCloud DNS Manager</h1>

<p align="center">
  <strong>A Cloudflare extension for your code editor. Manage multiple accounts, migrate domains, edit DNS records, and manage team members without leaving your editor.</strong>
</p>

<p align="center">
  <a href="https://github.com/TadashiDevs/tadacloud-dns-manager/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License">
  </a>
  <a href="https://github.com/TadashiDevs/tadacloud-dns-manager">
    <img src="https://img.shields.io/github/stars/TadashiDevs/tadacloud-dns-manager?style=social" alt="Stars">
  </a>
</p>

<p align="center">
  You can find my extensions on the <a href="https://marketplace.visualstudio.com/publishers/TadashiDev">VS Code Marketplace</a> or the <a href="https://open-vsx.org/namespace/TadashiDev">Open VSX</a>
</p>

## 🆕 What's New in v1.3.1

### � Team Member Management
Manage your Cloudflare account team directly from your Code Editor!
- View all team members with their roles and status (✅ Active, ⏳ Pending, ❌ Rejected)
- Invite new members (single or multiple emails)
- Choose between entire account or specific domain access
- Multi-select roles for granular permissions
- Send invitation or add members directly
- Edit member permissions
- Resend pending invitations
- Remove members from account
- Copy member emails
- Refresh members list

### 🔧 Reliable Role Assignment
- **Fallback ID System**: 50+ role IDs to ensure correct permissions
- **Priority Logic**: Verified IDs are used over API response for reliability
- **Ad-Hoc Policies**: Special structure for domain-level permissions

### 🔒 Updated API Token Requirements
This version requires **4 specific permissions** for full functionality. See [Creating an API Token](#creating-an-api-token) below.

---

### ⚠️ Upgrading from v1.2.x or earlier?

> **IMPORTANT: We strongly recommend creating a NEW API Token instead of editing your existing one.**

Due to significant changes in how permissions are handled internally, editing an existing token may cause conflicts or cached permission issues. A clean token ensures reliable operation.

**Steps to upgrade:**

1. Go to [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click **"Create Token"** → **"Create Custom Token"**
3. Set the **4 required permissions** (see below)
4. Copy the new API Token
5. In your Code Editor, right-click your account → **"Update API Token"**
6. Paste the new token

**Why a new token?** The member invitation system now uses specific Permission Group IDs that require exact token permissions. A fresh token guarantees these work correctly.

---

<details>
<summary>📦 Previous Version: v1.2.0</summary>

- **🔒 Cloudflare Account ID**: New required field, encrypted securely like API Token
- **✅ RDAP Domain Validation**: Verifies domain exists before adding to Cloudflare
- **📋 Cloudflare Plan Selection**: Choose Free, Pro, Business, or Enterprise when adding domains
- **🔗 Persistent Nameserver Dialog**: Copy nameservers easily without dialog closing
- **🛠️ DNS Checker Fixes**: Correct propagation status for Proxied (🟠) and CNAME records
- **🔧 Fixed**: Invalid account identifier errors, input fields staying open

</details>

## Features

- 🔐 **Multiple Accounts**: Manage multiple Cloudflare accounts securely
- 🌐 **Domain Management**: View all your domains (zones) in one place
- 📝 **DNS Records**: Full CRUD operations for DNS records (21 record types supported)
- 👥 **Team Management**: Invite, edit, and remove team members with role-based access
- 🟠 **Quick Proxy Toggle**: Toggle Cloudflare proxy with one click
- 🔍 **DNS Checker**: Check DNS propagation status using Google and Cloudflare DNS
- ✅ **Domain Validation**: RDAP verification before adding domains
- 🎨 **Native UI**: Integrates seamlessly with VS Code's interface

## Installation

1. Open your Code Editor
2. Go to Extensions (`Ctrl+Shift+X`)
3. Search for "TadaCloud DNS Manager"
4. Click Install

## Getting Started

1. Click the TadaCloud icon in the Activity Bar (left sidebar)
2. Click the `+` button to add a Cloudflare account
3. Enter a friendly name for your account
4. Paste your Cloudflare Account ID (found on Dashboard sidebar)
5. Paste your Cloudflare API Token

### Creating an API Token

🔑 **How to create a Cloudflare API Token:**

1. Go to [Cloudflare Dashboard → Profile → API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click **"Create Token"** → **"Create Custom Token"**
3. Set these **4 permissions** (Critical for full functionality):
   - **Account → Account Settings → Edit**
   - **Zone → Zone Settings → Edit**
   - **Zone → Zone → Edit**
   - **Zone → DNS → Edit**
4. Resources:
   - Account Resources: Include → Your specific account
   - Zone Resources: Include → All zones
5. Client IP Filtering: Leave empty (do not add anything)
6. TTL: Set Start Date to today and leave End Date empty
7. Copy your API Token and your Account ID
   (Account ID is on the right sidebar of your Dashboard)

🔒 **Your credentials are encrypted and stored securely in your OS keychain via VS Code SecretStorage.**

⚠️ **Important:** Both API Token and Account ID are required!

⚠️ **Do NOT use Global API Key** - use API Token only!

### Managing Accounts

Right-click on an account to:
- ✏️ Rename Account
- 🔑 Update API Token
- 🔄 Refresh Domains
- 🌐 Migrate Domain to Cloudflare
- 👥 Invite Member
- 🗑️ Delete Account

### Managing Team Members

The **Team Members** node appears under each account and shows all members with their roles and status.

**Inviting Members:**
1. Right-click on your account → **"Invite Member"**
2. Enter email addresses (comma-separated for multiple)
3. Select access scope:
   - **"Entire Account"** → Member gets account-level access
   - **"Specific Domains"** → Member only accesses selected domains
4. If specific domains, select which ones (multi-select)
5. Select roles (multi-select - toggle on/off)
6. Choose to send invitation or add directly

**Available Roles:**
- **Account-level**: Administrator, Analytics, Billing, DNS, Firewall, Workers, Zero Trust, etc.
- **Domain-level**: Domain DNS, Domain Administrator, Bot Management, Cache Purge, Page Shield, etc.

**Managing Members:**

Right-click on a team member to:
- ✏️ **Edit Permissions** - Change roles and domain access
- 📋 **Copy Email** - Copy member email to clipboard
- 📨 **Resend Invitation** - Resend email to pending members
- 🗑️ **Remove Member** - Remove from account with confirmation

Right-click on **"Team Members"** node to:
- 🔄 **Refresh Members** - Update the members list

**Member Status Icons:**
- ✅ Active member (accepted invitation)
- ⏳ Pending invitation (waiting for response)
- ❌ Rejected invitation

### Migrating a Domain to Cloudflare

You can add new domains to Cloudflare directly from VS Code:

1. Right-click on your account name
2. Select **"Migrate Domain to Cloudflare"**
3. Enter your domain name (e.g., `example.com`)
4. Cloudflare will:
   - Import existing DNS records automatically
   - Assign nameservers for your domain
5. Copy the nameservers and update them at your registrar
6. Wait 24-48 hours for propagation

The domain will appear with 🟡 (pending) status until the nameservers are updated.

### Managing DNS Records

Right-click on a domain to:
- ➕ Add DNS Record
- 🔄 Refresh Records
- 🌐 Open in Cloudflare
- 📋 Copy Zone ID

Right-click on a DNS record to:
- ✏️ Edit Record
- 🔀 Toggle Proxy
- 📋 Copy Content/IP
- 🔍 DNS Checker (check propagation status)
- 🗑️ Delete Record

### DNS Checker

The DNS Checker feature allows you to verify if your DNS records have propagated globally. It queries Google DNS and Cloudflare DNS to check if your records are resolving correctly.

**Supported record types for propagation checking:**
- A, AAAA, CNAME, MX, TXT, NS

**Status indicators:**
- ✅ **Propagated**: All DNS servers return the expected value
- ⚠️ **Partially Propagated**: Some servers have the new value
- ⏳ **Still Propagating**: Servers haven't updated yet

### Supported DNS Record Types

TadaCloud DNS Manager supports all 21 Cloudflare DNS record types:

| Type | Description |
|------|-------------|
| A | IPv4 Address |
| AAAA | IPv6 Address |
| CAA | Certificate Authority Authorization |
| CERT | Certificate |
| CNAME | Canonical Name |
| DNSKEY | DNS Key |
| DS | Delegation Signer |
| HTTPS | HTTPS Service Binding |
| LOC | Location |
| MX | Mail Exchange |
| NAPTR | Naming Authority Pointer |
| NS | Name Server |
| OPENPGPKEY | OpenPGP Key |
| PTR | Pointer |
| SMIMEA | S/MIME Certificate |
| SRV | Service |
| SSHFP | SSH Fingerprint |
| SVCB | Service Binding |
| TLSA | TLS Authentication |
| TXT | Text Record |
| URI | Uniform Resource Identifier |

## Configuration

Open Settings and search for `tadacloud-dns-manager`:

| Setting | Default | Description |
|---------|---------|-------------|
| `defaultTTL` | `auto` | Default TTL for new records |
| `defaultProxyEnabled` | `true` | Enable proxy by default |
| `visibleRecordTypes` | `["A", "AAAA", "CNAME", "MX", "TXT"]` | Record types to display |
| `confirmBeforeDelete` | `true` | Show confirmation before deleting |
| `showRecordCount` | `true` | Show record count on domains |

## Security

- API tokens are stored securely using VS Code's SecretStorage (encrypted)
- Tokens are never exposed in logs or settings files
- All communication with Cloudflare uses HTTPS

## Technical Transparency

This extension uses an internal system to ensure reliable member role assignment across all Cloudflare account types:

**Why is this needed?**

Cloudflare's public API sometimes returns Permission Group IDs that are not accepted by the Members API, particularly on Free and Pro accounts. This causes "invalid permission group" errors when inviting members.

**How we solve it:**

- **Fallback ID System**: The extension maintains an internal list of 50+ verified Permission Group IDs, reverse-engineered from the Cloudflare Dashboard
- **Priority Logic**: Hardcoded IDs are checked before API responses to ensure reliability
- **Ad-Hoc Policies**: For domain-specific permissions, we use a special "Ad-Hoc" scope structure that matches Cloudflare Dashboard behavior

This is completely transparent and does not modify any Cloudflare settings. It simply ensures that the correct IDs are used when making API requests.

## Feedback & Support

If you find this extension useful, please consider:

⭐ **Leave a star** - it helps others discover this extension!

💬 **Write a review** - your feedback helps improve the extension

If you have any theme requests or issues, please [open an issue](https://github.com/TadashiDevs/tadacloud-dns-manager/issues/new).


## 📄 License

[MIT](https://github.com/TadashiDevs/tadacloud-dns-manager/blob/main/LICENSE) © [TadashiDevs](https://github.com/TadashiDevs)

