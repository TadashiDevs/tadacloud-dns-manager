import * as vscode from 'vscode';
import { CloudflareTreeDataProvider, ZoneTreeItem } from '../providers';
import { StorageService } from '../services';

/**
 * Command: Open zone in Cloudflare dashboard
 */
export async function openInCloudflare(zoneItem: ZoneTreeItem): Promise<void> {
    const zone = zoneItem.zone;

    // Get the Cloudflare Account ID from stored account
    const storageService = StorageService.getInstance();
    const accounts = await storageService.getAccounts();
    const account = accounts.find(a => a.id === zoneItem.accountId);

    if (account?.cloudflareAccountId) {
        // Use the real Cloudflare Account ID
        const url = `https://dash.cloudflare.com/${account.cloudflareAccountId}/${zone.name}/dns/records`;
        await vscode.env.openExternal(vscode.Uri.parse(url));
    } else {
        // Fallback to generic URL
        const url = `https://dash.cloudflare.com/?to=/:account/${zone.name}/dns/records`;
        await vscode.env.openExternal(vscode.Uri.parse(url));
    }
}

/**
 * Command: Copy zone ID to clipboard
 */
export async function copyZoneId(zoneItem: ZoneTreeItem): Promise<void> {
    await vscode.env.clipboard.writeText(zoneItem.zone.id);
    vscode.window.showInformationMessage(`Zone ID copied: ${zoneItem.zone.id}`);
}

/**
 * Command: Refresh a specific zone
 */
export function refreshZone(
    treeDataProvider: CloudflareTreeDataProvider,
    zoneItem: ZoneTreeItem
): void {
    treeDataProvider.refreshZone(zoneItem.accountId, zoneItem.zone.id);
    vscode.window.showInformationMessage(`Refreshing ${zoneItem.zone.name}...`);
}

/**
 * Command: Refresh all accounts
 */
export function refreshAll(treeDataProvider: CloudflareTreeDataProvider): void {
    treeDataProvider.refresh();
    vscode.window.showInformationMessage('Refreshing all accounts...');
}

/**
 * Command: Refresh a specific account
 */
export function refreshAccount(
    treeDataProvider: CloudflareTreeDataProvider,
    accountId: string
): void {
    treeDataProvider.refreshAccount(accountId);
}

/**
 * Command: Open extension settings
 */
export async function openSettings(): Promise<void> {
    await vscode.commands.executeCommand(
        'workbench.action.openSettings',
        'tadacloud-dns-manager'
    );
}
