import * as vscode from 'vscode';
import { StorageService, CloudflareApiService } from '../services';
import { CloudflareTreeDataProvider, ZoneTreeItem, DnsRecordTreeItem } from '../providers';

/**
 * SSL/TLS Mode options for Cloudflare
 */
const SSL_MODES = {
    AUTOMATIC: { label: '$(shield) Automatic SSL/TLS (Default)', description: 'Cloudflare manages your SSL mode', value: 'automatic' },
    CUSTOM: { label: '$(settings-gear) Custom SSL/TLS', description: 'Choose your own encryption mode', value: 'custom' }
};

const SSL_CUSTOM_MODES = [
    {
        label: '$(lock) Full (Strict)',
        description: 'Maximum security',
        detail: 'Encrypts end-to-end, requires valid origin certificate from a trusted CA',
        value: 'strict'
    },
    {
        label: '$(lock) Full',
        description: 'End-to-end encryption',
        detail: 'Encrypts end-to-end, self-signed certificates accepted',
        value: 'full'
    },
    {
        label: '$(unlock) Flexible',
        description: 'Browser-to-Cloudflare only',
        detail: 'Encrypts traffic between browser and Cloudflare. Origin connection is not encrypted',
        value: 'flexible'
    },
    {
        label: '$(warning) Off (not secure)',
        description: 'No encryption',
        detail: 'All traffic is sent unencrypted. Not recommended!',
        value: 'off'
    }
];

/**
 * Handle purge error with helpful messages for permission errors
 * Detects both HTTP 403 and Cloudflare error code 10000 (Authentication error)
 */
function handlePurgeError(error: Error, zoneName: string): void {
    const message = error.message;

    // Check for permission-related errors:
    // 1. HTTP 403 Forbidden
    // 2. Cloudflare error code 10000 (Authentication error - missing permissions)
    const isPermissionError =
        message.includes('403') ||
        message.includes('Forbidden') ||
        message.includes('10000') ||
        message.includes('Authentication error') ||
        message.includes('permission');

    if (isPermissionError) {
        // Show simple toast notification (no modal, no buttons)
        vscode.window.showErrorMessage(
            "⚠️ Permission Error: Your API Token does not allow cache purging. " +
            "Please update your token by adding the permission: 'Zone -> Cache Purge -> Purge'."
        );
    } else {
        // Show the original API error message
        vscode.window.showErrorMessage(`Failed to purge cache for ${zoneName}: ${message}`);
    }
}


/**
 * Handle SSL error with helpful messages for 403 errors
 */
function handleSSLError(error: Error, zoneName: string): void {
    const message = error.message;

    if (message.includes('403') || message.includes('Forbidden') || message.includes('permission')) {
        vscode.window.showErrorMessage(
            `❌ Permission Denied: Your API Token lacks the required SSL permissions.\n\n` +
            `Ensure your token has: Zone → Zone Settings → Edit`,
            { modal: true }
        );
    } else {
        vscode.window.showErrorMessage(`Failed to update SSL mode for ${zoneName}: ${message}`);
    }
}

/**
 * Command: Set SSL/TLS mode for a zone
 */
export async function setSSLMode(
    treeDataProvider: CloudflareTreeDataProvider,
    zoneItem: ZoneTreeItem
): Promise<void> {
    const zone = zoneItem.zone;
    const accountId = zoneItem.accountId;

    // Show loading while fetching current SSL mode
    const currentMode = await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: 'Fetching current SSL mode...',
            cancellable: false
        },
        async (): Promise<string | undefined> => {
            try {
                const storageService = StorageService.getInstance();
                const accountWithToken = await storageService.getAccountWithToken(accountId);

                if (!accountWithToken) {
                    throw new Error('Account token not found');
                }

                const apiService = new CloudflareApiService(accountWithToken.token, accountWithToken.cloudflareAccountId);
                return await apiService.getSSLMode(zone.id);
            } catch (error) {
                const err = error instanceof Error ? error : new Error('Unknown error');
                handleSSLError(err, zone.name);
                return undefined;
            }
        }
    );

    if (!currentMode) {
        return;
    }

    // Step 1: Show main menu (Automatic or Custom)
    const mainChoice = await vscode.window.showQuickPick(
        [SSL_MODES.AUTOMATIC, SSL_MODES.CUSTOM],
        {
            title: `🔒 SSL/TLS Mode for ${zone.name}`,
            placeHolder: `Current: ${currentMode.charAt(0).toUpperCase() + currentMode.slice(1)} | Press ESC to cancel`,
            ignoreFocusOut: true
        }
    );

    if (!mainChoice) {
        return;
    }

    let selectedMode: string;

    if (mainChoice.value === 'automatic') {
        // Set to recommended Full mode for automatic
        selectedMode = 'full';
        vscode.window.showInformationMessage(`SSL mode set to Automatic (Full) for ${zone.name}`);
    } else {
        // Step 2: Show custom mode submenu
        const customOptions = SSL_CUSTOM_MODES.map(mode => ({
            ...mode,
            label: mode.value === currentMode ? `${mode.label} ✓` : mode.label,
            description: mode.value === currentMode ? `${mode.description} (current)` : mode.description
        }));

        // Sort to put current mode first
        customOptions.sort((a, b) => {
            if (a.value === currentMode) return -1;
            if (b.value === currentMode) return 1;
            return 0;
        });

        const customChoice = await vscode.window.showQuickPick(customOptions, {
            title: `🔒 Select Custom SSL/TLS Mode for ${zone.name}`,
            placeHolder: 'Choose encryption level | Press ESC to cancel',
            ignoreFocusOut: true
        });

        if (!customChoice) {
            return;
        }

        selectedMode = customChoice.value;
    }

    // Apply the selected SSL mode
    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: `Setting SSL mode to ${selectedMode}...`,
            cancellable: false
        },
        async () => {
            try {
                const storageService = StorageService.getInstance();
                const accountWithToken = await storageService.getAccountWithToken(accountId);

                if (!accountWithToken) {
                    throw new Error('Account token not found');
                }

                const apiService = new CloudflareApiService(accountWithToken.token, accountWithToken.cloudflareAccountId);
                await apiService.setSSLMode(zone.id, selectedMode);

                vscode.window.setStatusBarMessage(
                    `✅ SSL mode updated to "${selectedMode}" for ${zone.name}`, 5000
                );
            } catch (error) {
                const err = error instanceof Error ? error : new Error('Unknown error');
                handleSSLError(err, zone.name);
            }
        }
    );
}

/**
 * Command: Purge entire cache for a zone (domain-level)
 */
export async function purgeCacheZone(
    treeDataProvider: CloudflareTreeDataProvider,
    zoneItem: ZoneTreeItem
): Promise<void> {
    const zone = zoneItem.zone;
    const accountId = zoneItem.accountId;

    // Show confirmation modal
    const confirmation = await vscode.window.showWarningMessage(
        `🧹 Are you sure you want to purge the ENTIRE cache for "${zone.name}"?\n\n` +
        `This will:\n` +
        `• Remove ALL cached files (HTML, CSS, JS, images, etc.)\n` +
        `• Temporarily increase load on your origin server\n` +
        `• May take a few seconds to propagate globally\n\n` +
        `⚠️ This action cannot be undone.`,
        { modal: true },
        'Yes, Purge Everything'
    );

    if (confirmation !== 'Yes, Purge Everything') {
        return;
    }

    // Show progress and execute purge
    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: `🧹 Purging cache for ${zone.name}...`,
            cancellable: false
        },
        async () => {
            try {
                const storageService = StorageService.getInstance();
                const accountWithToken = await storageService.getAccountWithToken(accountId);

                if (!accountWithToken) {
                    throw new Error('Account token not found');
                }

                const apiService = new CloudflareApiService(accountWithToken.token, accountWithToken.cloudflareAccountId);
                await apiService.purgeAllCache(zone.id);

                vscode.window.setStatusBarMessage(`✅ Cache purged successfully for ${zone.name}!`, 5000);
            } catch (error) {
                const err = error instanceof Error ? error : new Error('Unknown error');
                handlePurgeError(err, zone.name);
            }
        }
    );
}

/**
 * Command: Purge cache for a specific subdomain (DNS record level)
 * This is "Smart Purge" - purges everything associated with a specific hostname
 */
export async function purgeCacheSubdomain(
    treeDataProvider: CloudflareTreeDataProvider,
    recordItem: DnsRecordTreeItem
): Promise<void> {
    const record = recordItem.record;
    const hostname = record.name; // Full hostname like "tienda.tadashito.live"
    const zoneId = record.zoneId;
    const accountId = record.accountId;

    // Show confirmation modal
    const confirmation = await vscode.window.showWarningMessage(
        `🧹 Are you sure you want to purge the cache for subdomain "${hostname}"?\n\n` +
        `This will:\n` +
        `• Remove ALL cached files for this subdomain\n` +
        `• Affect: HTML, CSS, JS, images, and all other assets\n` +
        `• Only purges this subdomain, NOT the entire domain\n\n` +
        `⚠️ This action cannot be undone.`,
        { modal: true },
        'Yes, Purge Subdomain'
    );

    if (confirmation !== 'Yes, Purge Subdomain') {
        return;
    }

    // Show progress and execute purge
    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: `🧹 Purging cache for ${hostname}...`,
            cancellable: false
        },
        async () => {
            try {
                const storageService = StorageService.getInstance();
                const accountWithToken = await storageService.getAccountWithToken(accountId);

                if (!accountWithToken) {
                    throw new Error('Account token not found');
                }

                const apiService = new CloudflareApiService(accountWithToken.token, accountWithToken.cloudflareAccountId);
                await apiService.purgeHostCache(zoneId, hostname);

                vscode.window.setStatusBarMessage(`✅ Cache purged successfully for ${hostname}!`, 5000);
            } catch (error) {
                const err = error instanceof Error ? error : new Error('Unknown error');
                handlePurgeError(err, hostname);
            }
        }
    );
}

/**
 * Register cache-related commands
 */
export function registerCacheCommands(
    context: vscode.ExtensionContext,
    treeDataProvider: CloudflareTreeDataProvider
): void {
    // SSL Mode command (Zone level)
    context.subscriptions.push(
        vscode.commands.registerCommand('tadacloud.setSSLMode', (item: ZoneTreeItem) => {
            if (item instanceof ZoneTreeItem) {
                setSSLMode(treeDataProvider, item);
            }
        })
    );

    // Purge All Cache command (Zone level)
    context.subscriptions.push(
        vscode.commands.registerCommand('tadacloud.purgeCacheZone', (item: ZoneTreeItem) => {
            if (item instanceof ZoneTreeItem) {
                purgeCacheZone(treeDataProvider, item);
            }
        })
    );

    // Purge Subdomain Cache command (DNS Record level)
    context.subscriptions.push(
        vscode.commands.registerCommand('tadacloud.purgeCacheSubdomain', (item: DnsRecordTreeItem) => {
            if (item instanceof DnsRecordTreeItem) {
                purgeCacheSubdomain(treeDataProvider, item);
            }
        })
    );
}
