<p align="center">
  <img src="resources/icons/icono-tadacloudmanager.png" alt="TadaKey 2FA Logo" width="128">
</p>

<h1 align="center">TadaCloud DNS Manager</h1>

<p align="center">
  <strong>A Cloudflare extension for your code editor. Manage multiple accounts, migrate domains, and edit DNS records without leaving your editor.</strong>
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

## 🆕 What's New in v1.2.0

- **🔒 Cloudflare Account ID**: New required field, encrypted securely like API Token
- **✅ RDAP Domain Validation**: Verifies domain exists before adding to Cloudflare
- **📋 Cloudflare Plan Selection**: Choose Free, Pro, Business, or Enterprise when adding domains
- **🔗 Persistent Nameserver Dialog**: Copy nameservers easily without dialog closing
- **🛠️ DNS Checker Fixes**: Correct propagation status for Proxied (🟠) and CNAME records
- **🔧 Fixed**: Invalid account identifier errors, input fields staying open

### ⚠️ Upgrading from v1.1.x or earlier?

If you're updating from a previous version, you'll need to:

1. **Delete your existing account** in the extension (right-click → Delete Account)
2. **Create a new API Token** in Cloudflare with the updated permissions (see instructions below)
3. **Add the account again** with your Account ID and new API Token

This is required because v1.2.0 now requires your Cloudflare Account ID for adding domains.

## Features

- 🔐 **Multiple Accounts**: Manage multiple Cloudflare accounts securely
- 🌐 **Domain Management**: View all your domains (zones) in one place
- 📝 **DNS Records**: Full CRUD operations for DNS records (21 record types supported)
- 🟠 **Quick Proxy Toggle**: Toggle Cloudflare proxy with one click
- 🔍 **DNS Checker**: Check DNS propagation status using Google and Cloudflare DNS
- ✅ **Domain Validation**: RDAP verification before adding domains
- 🎨 **Native UI**: Integrates seamlessly with VS Code's interface

## Installation

1. Open VS Code
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
2. Click "Create Token" → "Create Custom Token"
3. Set these **3 permissions**:
   - **Account → Account Settings → Read**
   - **Zone → Zone → Edit**
   - **Zone → DNS → Edit**
4. Resources:
   - Account Resources: Include → Your specific account
   - Zone Resources: Include → All zones
5. Client IP Filtering: Leave empty (do not add anything)
6. TTL: Set Start Date to today and leave End Date empty
7. Copy your API Token and your Account ID (found on your Dashboard sidebar)

🔒 **Security:** Your credentials (API Token and Account ID) are encrypted and stored securely in your OS keychain via VS Code SecretStorage.

**⚠️ Important:** Both API Token and Account ID are required for adding domains.

**⚠️ Do NOT use Global API Key** - use API Token only!

### Managing Accounts

Right-click on an account to:
- ✏️ Rename Account
- 🔑 Update API Token
- 🔄 Refresh Domains
- 🌐 Migrate Domain to Cloudflare
- 🗑️ Delete Account

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

## Feedback & Support

If you find this extension useful, please consider:

⭐ **Leave a star** - it helps others discover this extension!

💬 **Write a review** - your feedback helps improve the extension

If you have any theme requests or issues, please [open an issue](https://github.com/TadashiDevs/tadacloud-dns-manager/issues/new).


## 📄 License

[MIT](https://github.com/TadashiDevs/tadacloud-dns-manager/blob/main/LICENSE) © [TadashiDevs](https://github.com/TadashiDevs

