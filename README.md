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

## 🆕 What's New in v1.4.0

### � SSL/TLS Mode Management
Control your domain's encryption settings directly from your editor!
- **Set SSL Mode**: Right-click any domain → "Set SSL Mode"
- **Automatic Mode**: Let Cloudflare manage your SSL (recommended Full)
- **Custom Modes**: Choose from Full (Strict), Full, Flexible, or Off
- Current mode is highlighted in the menu

### 🧹 Cache Purge (Smart Purge)
Purge Cloudflare cache without leaving your editor!

**Domain-Level (Purge Everything):**
- Right-click any domain → "🧹 Purge Cache (Everything)"
- Removes ALL cached files for the entire zone
- Confirmation dialog prevents accidental purges

**Subdomain-Level (Smart Purge):**
- Right-click any DNS record → "🧹 Purge Subdomain Cache"
- Purges ONLY the specific subdomain (e.g., `prueba.example.com`)
- Surgical precision - doesn't affect other subdomains or root domain

### 🔐 New API Permission Required
This version requires a **new permission** for cache purge features: `Zone → Cache Purge → Purge`. Edit your existing API Token to add this permission.

---

### ⚠️ Upgrading from v1.3.x or earlier?

> **IMPORTANT: You need to update your API Token to use Cache Purge features.**

v1.4.0 adds a new permission requirement for cache operations.

**Steps to upgrade:**

1. Go to [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click **"Edit"** on your existing token, or create a new one
3. Add the **5th permission**: `Zone → Cache Purge → Purge`
4. Save and update your token in the extension (right-click account → "Update API Token")

**Why?** Cache purge operations require explicit permission. Without it, you'll see a 403 error (the extension will tell you exactly what's missing).

---

<details>
<summary>📦 Previous Version: v1.3.1</summary>

- **🛠️ Team Member Management**: Manage Cloudflare team members directly from VS Code
- **👥 Invite Members**: Single or multiple emails, choose account or domain access
- **✏️ Edit Permissions**: Modify member roles via right-click
- **🔧 Fallback ID System**: 50+ role IDs for reliable permission assignment
- **Ad-Hoc Policies**: Special structure for domain-level permissions

</details>

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
- 🔒 **SSL/TLS Control**: Set encryption mode (Full Strict, Full, Flexible, Off)
- 🧹 **Cache Purge**: Purge entire domain or specific subdomains
- 🟠 **Quick Proxy Toggle**: Toggle Cloudflare proxy with one click
- 🔍 **DNS Checker**: Check DNS propagation status using Google and Cloudflare DNS
- ✅ **Domain Validation**: RDAP verification before adding domains
- 🎨 **Native UI**: Integrates seamlessly with VS Code's interface

## Installation

1. Open your Code Editor
2. Go to Extensions (`Ctrl+Shift+X`)
3. Search for "TadaCloud DNS Manager"
4. Click Install

---

## 🔐 Linux Security Requirements

<details>
<summary><strong>🐧 Click here if you're using Linux</strong></summary>

<br>

> **If you encounter the error "An OS keyring couldn't be identified" or extension secrets are not saving, follow these steps:**

### 1️⃣ Install Dependencies

Choose the command for your distribution:

| Distribution | Command |
|--------------|---------|
| **Arch Linux / Manjaro** | `sudo pacman -S gnome-keyring libsecret seahorse` |
| **Debian / Ubuntu / Mint** | `sudo apt install gnome-keyring libsecret-1-0 seahorse` |
| **Fedora** | `sudo dnf install gnome-keyring libsecret seahorse` |

### 2️⃣ Setup the Keyring (GUI)

1. Open **Seahorse** (search for "Passwords and Keys" in your applications menu)
2. Click the **`+`** button and select **"Password Keyring"**
3. Name it exactly: **`Login`**
4. Right-click on the new "Login" keyring → **"Set as default"**
5. Ensure the 🔓 padlock icon is **open** (Unlocked)

### 3️⃣ Configure your Editor

You must tell your editor to use the system keyring:

1. Open the **Command Palette** (`Ctrl+Shift+P`)
2. Type: `Preferences: Configure Runtime Arguments`
3. This will open `argv.json`
4. Add the following line (ensure correct JSON commas):

```json
"password-store": "gnome"
```

### 4️⃣ Restart your editor completely

Close and reopen your editor for changes to take effect.

---

✅ After completing these steps, your API tokens and credentials will be stored securely in your system keyring.

</details>

---

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
3. Set these **5 permissions** (Critical for full functionality):
   - **Account → Account Settings → Edit**
   - **Zone → Zone Settings → Edit**
   - **Zone → Zone → Edit**
   - **Zone → DNS → Edit**
   - **Zone → Cache Purge → Purge**
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

