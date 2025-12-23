import * as vscode from 'vscode';
import { StorageService } from './services';
import { CloudflareTreeDataProvider, AccountTreeItem, ZoneTreeItem, DnsRecordTreeItem } from './providers';
import {
    addAccount,
    renameAccount,
    updateToken,
    deleteAccount,
    addDnsRecord,
    editDnsRecord,
    deleteDnsRecord,
    toggleProxy,
    copyRecordContent,
    openInCloudflare,
    copyZoneId,
    refreshZone,
    refreshAll,
    refreshAccount,
    openSettings,
    dnsChecker,
    migrateDomain
} from './commands';

let treeDataProvider: CloudflareTreeDataProvider;

/**
 * Extension activation
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('TadaCloud DNS Manager is now active!');

    // Initialize storage service
    StorageService.initialize(context);

    // Initialize tree data provider
    treeDataProvider = new CloudflareTreeDataProvider();

    // Register tree view
    const treeView = vscode.window.createTreeView('tadacloud-dns-manager-view', {
        treeDataProvider,
        showCollapseAll: true
    });
    context.subscriptions.push(treeView);

    // Register commands
    registerCommands(context);

    console.log('TadaCloud DNS Manager commands registered successfully!');
}

/**
 * Register all extension commands
 */
function registerCommands(context: vscode.ExtensionContext) {
    // Account commands
    context.subscriptions.push(
        vscode.commands.registerCommand('tadacloud.addAccount', () => {
            addAccount(treeDataProvider);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('tadacloud.renameAccount', (item: AccountTreeItem) => {
            if (item instanceof AccountTreeItem) {
                renameAccount(treeDataProvider, item.account.id, item.account.name);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('tadacloud.updateToken', (item: AccountTreeItem) => {
            if (item instanceof AccountTreeItem) {
                updateToken(treeDataProvider, item.account.id);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('tadacloud.deleteAccount', (item: AccountTreeItem) => {
            if (item instanceof AccountTreeItem) {
                deleteAccount(treeDataProvider, item.account.id, item.account.name);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('tadacloud.refreshAccount', (item: AccountTreeItem) => {
            if (item instanceof AccountTreeItem) {
                refreshAccount(treeDataProvider, item.account.id);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('tadacloud.migrateDomain', (item: AccountTreeItem) => {
            if (item instanceof AccountTreeItem) {
                migrateDomain(treeDataProvider, item.account.id, item.account.name);
            }
        })
    );

    // Zone commands
    context.subscriptions.push(
        vscode.commands.registerCommand('tadacloud.addDnsRecord', (item: ZoneTreeItem) => {
            if (item instanceof ZoneTreeItem) {
                addDnsRecord(treeDataProvider, item);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('tadacloud.refreshZone', (item: ZoneTreeItem) => {
            if (item instanceof ZoneTreeItem) {
                refreshZone(treeDataProvider, item);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('tadacloud.openInCloudflare', (item: ZoneTreeItem) => {
            if (item instanceof ZoneTreeItem) {
                openInCloudflare(item);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('tadacloud.copyZoneId', (item: ZoneTreeItem) => {
            if (item instanceof ZoneTreeItem) {
                copyZoneId(item);
            }
        })
    );

    // DNS Record commands
    context.subscriptions.push(
        vscode.commands.registerCommand('tadacloud.editDnsRecord', (item: DnsRecordTreeItem) => {
            if (item instanceof DnsRecordTreeItem) {
                editDnsRecord(treeDataProvider, item);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('tadacloud.toggleProxy', (item: DnsRecordTreeItem) => {
            if (item instanceof DnsRecordTreeItem) {
                toggleProxy(treeDataProvider, item);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('tadacloud.copyRecordContent', (item: DnsRecordTreeItem) => {
            if (item instanceof DnsRecordTreeItem) {
                copyRecordContent(item);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('tadacloud.deleteDnsRecord', (item: DnsRecordTreeItem) => {
            if (item instanceof DnsRecordTreeItem) {
                deleteDnsRecord(treeDataProvider, item);
            }
        })
    );

    // Global commands
    context.subscriptions.push(
        vscode.commands.registerCommand('tadacloud.refreshAll', () => {
            refreshAll(treeDataProvider);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('tadacloud.openSettings', () => {
            openSettings();
        })
    );

    // DNS Checker command
    context.subscriptions.push(
        vscode.commands.registerCommand('tadacloud.dnsChecker', (item: DnsRecordTreeItem) => {
            if (item instanceof DnsRecordTreeItem) {
                dnsChecker(item);
            }
        })
    );
}

/**
 * Extension deactivation
 */
export function deactivate() {
    console.log('TadaCloud DNS Manager is now deactivated.');
}
