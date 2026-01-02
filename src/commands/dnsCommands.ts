import * as vscode from 'vscode';
import { StorageService, CloudflareApiService, DnsCheckerService, isPropagationCheckable, getNonCheckableMessage } from '../services';
import { CloudflareTreeDataProvider, ZoneTreeItem, DnsRecordTreeItem } from '../providers';
import { DnsRecord, CreateDnsRecordData, UpdateDnsRecordData, isProxiable } from '../models';
import { CONFIG_KEYS, RECORD_TYPE_OPTIONS, TTL_OPTIONS } from '../utils';

/**
 * Command: Add a new DNS record
 * Order: Type → Name → Content → Proxy → TTL
 */
export async function addDnsRecord(
    treeDataProvider: CloudflareTreeDataProvider,
    zoneItem: ZoneTreeItem
): Promise<void> {
    const zone = zoneItem.zone;
    const accountId = zoneItem.accountId;

    // Step 1: Select record type
    const recordType = await vscode.window.showQuickPick(
        RECORD_TYPE_OPTIONS.map(opt => ({
            label: opt.label,
            value: opt.value
        })),
        {
            title: `Add DNS Record to ${zone.name} (1/5)`,
            placeHolder: 'Select record type'
        }
    );

    if (!recordType) {
        return;
    }

    // Step 2: Enter name
    const name = await vscode.window.showInputBox({
        title: `Add ${recordType.value} Record (2/5)`,
        prompt: 'Enter subdomain name (use @ for root domain)',
        placeHolder: 'e.g., www, api, @ for root',
        validateInput: (value) => {
            if (!value || value.trim().length === 0) {
                return 'Name is required';
            }
            return null;
        }
    });

    if (!name) {
        return;
    }

    // Step 3: Enter content (address/value)
    const contentPrompt = getContentPrompt(recordType.value);
    const content = await vscode.window.showInputBox({
        title: `Add ${recordType.value} Record (3/5)`,
        prompt: contentPrompt.prompt,
        placeHolder: contentPrompt.placeholder,
        validateInput: (value) => {
            if (!value || value.trim().length === 0) {
                return 'Content is required';
            }
            return null;
        }
    });

    if (!content) {
        return;
    }

    // Step 4: Priority for MX records (inserted before proxy)
    let priority: number | undefined;
    if (recordType.value === 'MX') {
        const priorityInput = await vscode.window.showInputBox({
            title: 'MX Priority',
            prompt: 'Enter priority (lower number = higher priority)',
            placeHolder: 'e.g., 10',
            validateInput: (value) => {
                const num = parseInt(value, 10);
                if (isNaN(num) || num < 0 || num > 65535) {
                    return 'Priority must be a number between 0 and 65535';
                }
                return null;
            }
        });

        if (!priorityInput) {
            return;
        }
        priority = parseInt(priorityInput, 10);
    }

    // Step 5: Proxy status for applicable records
    let proxied = false;
    if (isProxiable(recordType.value as any)) {
        const proxyChoice = await vscode.window.showQuickPick(
            [
                { label: '🟠 Proxied (recommended)', value: true },
                { label: '⚪ DNS Only', value: false }
            ],
            {
                title: `Add ${recordType.value} Record (4/5)`,
                placeHolder: 'Proxy Status - Enable Cloudflare proxy?'
            }
        );

        if (proxyChoice === undefined) {
            return;
        }
        proxied = proxyChoice.value;
    }

    // Step 6: Select TTL
    const ttl = await vscode.window.showQuickPick(
        TTL_OPTIONS.map(opt => ({
            label: opt.label,
            value: opt.value
        })),
        {
            title: `Add ${recordType.value} Record (5/5)`,
            placeHolder: 'Select TTL (Time to Live)'
        }
    );

    if (!ttl) {
        return;
    }

    // Create the record
    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: 'Creating DNS record...',
            cancellable: false
        },
        async () => {
            try {
                const storageService = StorageService.getInstance();
                const accountWithToken = await storageService.getAccountWithToken(accountId);

                if (!accountWithToken) {
                    throw new Error('Account token not found');
                }

                const data: CreateDnsRecordData = {
                    type: recordType.value as any,
                    name: name.trim(),
                    content: content.trim(),
                    ttl: ttl.value,
                    proxied,
                    priority
                };

                const apiService = new CloudflareApiService(accountWithToken.token, accountId);
                await apiService.createDnsRecord(zone.id, data);

                treeDataProvider.refreshZone(accountId, zone.id);
                vscode.window.showInformationMessage(`DNS record created successfully!`);
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                vscode.window.showErrorMessage(`Failed to create DNS record: ${message}`);
            }
        }
    );
}

/**
 * Command: Edit a DNS record
 * Order: Type → Name → Content → Proxy → TTL
 */
export async function editDnsRecord(
    treeDataProvider: CloudflareTreeDataProvider,
    recordItem: DnsRecordTreeItem
): Promise<void> {
    const record = recordItem.record;
    const zoneId = record.zoneId;
    const accountId = record.accountId;

    // Extract current subdomain from full name
    const currentSubdomain = record.name.replace(/\.[^.]+\.[^.]+$/, '') || '@';

    // Step 1: Edit record type - put current type first
    const typeOptions = RECORD_TYPE_OPTIONS.map(opt => ({
        label: opt.value === record.type ? `${opt.label} ✓` : opt.label,
        value: opt.value,
        description: opt.value === record.type ? '(current)' : undefined
    }));
    // Sort to put current type first
    typeOptions.sort((a, b) => {
        if (a.value === record.type) return -1;
        if (b.value === record.type) return 1;
        return 0;
    });

    const recordType = await vscode.window.showQuickPick(typeOptions, {
        title: `Edit Record (1/5) - Type`,
        placeHolder: `Current: ${record.type}`
    });

    if (!recordType) {
        return;
    }

    // Step 2: Edit name
    const name = await vscode.window.showInputBox({
        title: `Edit ${recordType.value} Record (2/5) - Name`,
        prompt: 'Enter subdomain name (use @ for root domain)',
        value: currentSubdomain,
        placeHolder: 'e.g., www, api, @ for root',
        validateInput: (value) => {
            if (!value || value.trim().length === 0) {
                return 'Name is required';
            }
            return null;
        }
    });

    if (!name) {
        return;
    }

    // Step 3: Edit content (address)
    const contentPrompt = getContentPrompt(recordType.value);
    const content = await vscode.window.showInputBox({
        title: `Edit ${recordType.value} Record (3/5) - Address`,
        prompt: contentPrompt.prompt,
        value: record.content,
        validateInput: (value) => {
            if (!value || value.trim().length === 0) {
                return 'Content is required';
            }
            return null;
        }
    });

    if (!content) {
        return;
    }

    // Step 4: Proxy status for applicable records - put current status first
    let proxied = record.proxied;
    if (isProxiable(recordType.value as any)) {
        const proxyOptions = record.proxied
            ? [
                { label: '🟠 Proxied ✓', value: true, description: '(current)' },
                { label: '⚪ DNS Only', value: false }
            ]
            : [
                { label: '⚪ DNS Only ✓', value: false, description: '(current)' },
                { label: '🟠 Proxied', value: true }
            ];

        const proxyChoice = await vscode.window.showQuickPick(proxyOptions, {
            title: `Edit ${recordType.value} Record (4/5) - Proxy Status`,
            placeHolder: `Current: ${record.proxied ? 'Proxied 🟠' : 'DNS Only ⚪'}`
        });

        if (proxyChoice === undefined) {
            return;
        }
        proxied = proxyChoice.value;
    }

    // Step 5: Edit TTL - put current TTL first
    const ttlOptions = TTL_OPTIONS.map(opt => ({
        label: opt.value === record.ttl ? `${opt.label} ✓` : opt.label,
        value: opt.value,
        description: opt.value === record.ttl ? '(current)' : undefined
    }));
    // Sort to put current TTL first
    ttlOptions.sort((a, b) => {
        if (a.value === record.ttl) return -1;
        if (b.value === record.ttl) return 1;
        return 0;
    });

    const ttl = await vscode.window.showQuickPick(ttlOptions, {
        title: `Edit ${recordType.value} Record (5/5) - TTL`,
        placeHolder: `Current: ${TTL_OPTIONS.find(opt => opt.value === record.ttl)?.label || 'Auto'}`
    });

    if (!ttl) {
        return;
    }

    // Update the record
    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: 'Updating DNS record...',
            cancellable: false
        },
        async () => {
            try {
                const storageService = StorageService.getInstance();
                const accountWithToken = await storageService.getAccountWithToken(accountId);

                if (!accountWithToken) {
                    throw new Error('Account token not found');
                }

                const data: UpdateDnsRecordData = {
                    type: recordType.value as any,
                    name: name.trim(),
                    content: content.trim(),
                    ttl: ttl.value,
                    proxied
                };

                const apiService = new CloudflareApiService(accountWithToken.token, accountId);
                await apiService.updateDnsRecord(zoneId, record.id, data);

                treeDataProvider.refreshZone(accountId, zoneId);
                vscode.window.showInformationMessage(`DNS record updated successfully!`);
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                vscode.window.showErrorMessage(`Failed to update DNS record: ${message}`);
            }
        }
    );
}


/**
 * Command: Delete a DNS record
 */
export async function deleteDnsRecord(
    treeDataProvider: CloudflareTreeDataProvider,
    recordItem: DnsRecordTreeItem
): Promise<void> {
    const record = recordItem.record;
    const config = vscode.workspace.getConfiguration();
    const confirmDelete = config.get<boolean>(CONFIG_KEYS.CONFIRM_BEFORE_DELETE, true);

    if (confirmDelete) {
        const displayName = record.name.replace(/\.[^.]+\.[^.]+$/, '') || '@';
        const confirmation = await vscode.window.showWarningMessage(
            `Are you sure you want to delete this DNS record?\n\n${record.type}  ${displayName}  →  ${record.content}\n\n⚠ This will immediately affect your domain. This action cannot be undone.`,
            { modal: true },
            'Delete'
        );

        if (confirmation !== 'Delete') {
            return;
        }
    }

    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: 'Deleting DNS record...',
            cancellable: false
        },
        async () => {
            try {
                const storageService = StorageService.getInstance();
                const accountWithToken = await storageService.getAccountWithToken(record.accountId);

                if (!accountWithToken) {
                    throw new Error('Account token not found');
                }

                const apiService = new CloudflareApiService(accountWithToken.token, record.accountId);
                await apiService.deleteDnsRecord(record.zoneId, record.id);

                treeDataProvider.refreshZone(record.accountId, record.zoneId);
                vscode.window.showInformationMessage(`DNS record deleted.`);
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                vscode.window.showErrorMessage(`Failed to delete DNS record: ${message}`);
            }
        }
    );
}

/**
 * Command: Toggle proxy status for a DNS record
 */
export async function toggleProxy(
    treeDataProvider: CloudflareTreeDataProvider,
    recordItem: DnsRecordTreeItem
): Promise<void> {
    const record = recordItem.record;

    if (!isProxiable(record.type)) {
        vscode.window.showWarningMessage(`${record.type} records do not support proxying.`);
        return;
    }

    const newProxied = !record.proxied;

    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: `${newProxied ? 'Enabling' : 'Disabling'} proxy...`,
            cancellable: false
        },
        async () => {
            try {
                const storageService = StorageService.getInstance();
                const accountWithToken = await storageService.getAccountWithToken(record.accountId);

                if (!accountWithToken) {
                    throw new Error('Account token not found');
                }

                const apiService = new CloudflareApiService(accountWithToken.token, record.accountId);
                await apiService.toggleProxy(record.zoneId, record.id, newProxied);

                treeDataProvider.refreshZone(record.accountId, record.zoneId);
                vscode.window.showInformationMessage(
                    `Proxy ${newProxied ? 'enabled 🟠' : 'disabled ⚪'} for ${record.name}`
                );
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                vscode.window.showErrorMessage(`Failed to toggle proxy: ${message}`);
            }
        }
    );
}

/**
 * Command: Copy record content to clipboard
 */
export async function copyRecordContent(recordItem: DnsRecordTreeItem): Promise<void> {
    await vscode.env.clipboard.writeText(recordItem.record.content);
    vscode.window.showInformationMessage(`Copied: ${recordItem.record.content}`);
}

/**
 * Get content prompt based on record type
 */
function getContentPrompt(type: string): { prompt: string; placeholder: string } {
    switch (type) {
        case 'A':
            return { prompt: 'Enter IPv4 address', placeholder: 'e.g., 192.168.1.1' };
        case 'AAAA':
            return { prompt: 'Enter IPv6 address', placeholder: 'e.g., 2001:db8::1' };
        case 'CNAME':
            return { prompt: 'Enter target domain', placeholder: 'e.g., example.com' };
        case 'MX':
            return { prompt: 'Enter mail server domain', placeholder: 'e.g., mail.example.com' };
        case 'TXT':
            return { prompt: 'Enter text content', placeholder: 'e.g., v=spf1 include:_spf.google.com ~all' };
        case 'NS':
            return { prompt: 'Enter nameserver', placeholder: 'e.g., ns1.example.com' };
        case 'SRV':
            return { prompt: 'Enter SRV content', placeholder: 'priority weight port target' };
        case 'CAA':
            return { prompt: 'Enter CAA content', placeholder: 'e.g., 0 issue "letsencrypt.org"' };
        case 'CERT':
            return { prompt: 'Enter certificate data', placeholder: 'Certificate data' };
        case 'DNSKEY':
            return { prompt: 'Enter DNSKEY data', placeholder: 'DNSKEY data' };
        case 'DS':
            return { prompt: 'Enter DS data', placeholder: 'key-tag algorithm digest-type digest' };
        case 'HTTPS':
            return { prompt: 'Enter HTTPS service binding', placeholder: 'priority target params' };
        case 'LOC':
            return { prompt: 'Enter location data', placeholder: 'latitude longitude altitude' };
        case 'NAPTR':
            return { prompt: 'Enter NAPTR data', placeholder: 'order preference flags service regexp replacement' };
        case 'OPENPGPKEY':
            return { prompt: 'Enter OpenPGP key', placeholder: 'Base64 encoded key' };
        case 'PTR':
            return { prompt: 'Enter PTR domain', placeholder: 'e.g., host.example.com' };
        case 'SMIMEA':
            return { prompt: 'Enter S/MIME certificate', placeholder: 'usage selector matching-type certificate' };
        case 'SSHFP':
            return { prompt: 'Enter SSH fingerprint', placeholder: 'algorithm type fingerprint' };
        case 'SVCB':
            return { prompt: 'Enter SVCB data', placeholder: 'priority target params' };
        case 'TLSA':
            return { prompt: 'Enter TLSA data', placeholder: 'usage selector matching-type certificate' };
        case 'URI':
            return { prompt: 'Enter URI data', placeholder: 'priority weight target' };
        default:
            return { prompt: 'Enter content', placeholder: '' };
    }
}

/**
 * Command: Check DNS propagation
 */
export async function dnsChecker(recordItem: DnsRecordTreeItem): Promise<void> {
    const record = recordItem.record;

    // Check if this record type supports propagation checking
    if (!isPropagationCheckable(record.type)) {
        const message = getNonCheckableMessage(record.type);
        vscode.window.showInformationMessage(`ℹ️ DNS Checker: ${message}`);
        return;
    }

    // Show checking notification
    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: `🔍 Checking DNS propagation for ${record.name}...`,
            cancellable: false
        },
        async () => {
            try {
                const dnsCheckerService = new DnsCheckerService();
                const result = await dnsCheckerService.checkPropagation(
                    record.name,
                    record.type,
                    record.content,
                    record.proxied // Pass the proxied flag
                );

                // Build result message based on whether record is proxied
                const serverResults = result.results.map(r => {
                    if (r.status === 'resolved') {
                        if (result.isProxied && r.isCloudflareProxy) {
                            return `${r.server}: ✓ ${r.value} (CF Proxy)`;
                        } else if (result.isProxied) {
                            return `${r.server}: ✓ ${r.value}`;
                        } else {
                            const matches = r.value?.toLowerCase().replace(/\.+$/, '') ===
                                record.content.toLowerCase().replace(/\.+$/, '');
                            return `${r.server}: ${matches ? '✓' : '≠'} ${r.value || 'N/A'}`;
                        }
                    } else if (r.status === 'not_resolved') {
                        return `${r.server}: ⏳ Not resolved`;
                    } else {
                        return `${r.server}: ❌ Error`;
                    }
                }).join(' | ');

                if (result.allMatch) {
                    if (result.isProxied) {
                        vscode.window.showInformationMessage(
                            `✅ DNS Propagated! ${record.name} 🟠 Proxied (${serverResults})`
                        );
                    } else {
                        vscode.window.showInformationMessage(
                            `✅ DNS Propagated! ${record.name} → ${record.content} (${serverResults})`
                        );
                    }
                } else if (result.matchCount > 0) {
                    vscode.window.showWarningMessage(
                        `⚠️ Partially Propagated (${result.matchCount}/${result.totalServers}) ${record.name} → ${serverResults}`
                    );
                } else {
                    vscode.window.showWarningMessage(
                        `⏳ Still Propagating... ${record.name} → ${serverResults}`
                    );
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                vscode.window.showErrorMessage(`Failed to check DNS propagation: ${message}`);
            }
        }
    );
}

