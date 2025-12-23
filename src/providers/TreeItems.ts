import * as vscode from 'vscode';
import { Account, Zone, DnsRecord, isProxiable } from '../models';
import { ZoneStatusIcons } from '../models/Zone';
import { PROXY_ICONS } from '../utils';

/**
 * Base tree item for all nodes
 */
export abstract class BaseTreeItem extends vscode.TreeItem {
    constructor(
        label: string,
        collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
    }
}

/**
 * Tree item representing a Cloudflare account
 */
export class AccountTreeItem extends BaseTreeItem {
    public readonly account: Account;

    constructor(account: Account) {
        super(account.name, vscode.TreeItemCollapsibleState.Collapsed);
        this.account = account;
        this.contextValue = 'account';
        this.iconPath = new vscode.ThemeIcon('organization');
        this.tooltip = `Account: ${account.name}`;
        this.description = '';
    }
}

/**
 * Tree item representing a Cloudflare zone (domain)
 */
export class ZoneTreeItem extends BaseTreeItem {
    public readonly zone: Zone;
    public readonly accountId: string;

    constructor(zone: Zone, accountId: string) {
        const statusIcon = ZoneStatusIcons[zone.status] || '⚪';
        super(zone.name, vscode.TreeItemCollapsibleState.Collapsed);

        this.zone = zone;
        this.accountId = accountId;
        this.contextValue = 'zone';
        this.iconPath = new vscode.ThemeIcon('globe');

        // Build description with status and record count
        let description = `(${zone.status})`;
        if (zone.recordCount !== undefined) {
            description += ` [${zone.recordCount}]`;
        }
        this.description = `${statusIcon} ${description}`;

        this.tooltip = new vscode.MarkdownString();
        this.tooltip.appendMarkdown(`**Domain:** ${zone.name}\n\n`);
        this.tooltip.appendMarkdown(`**Status:** ${zone.status}\n\n`);
        this.tooltip.appendMarkdown(`**Zone ID:** \`${zone.id}\``);
    }
}

/**
 * Tree item representing a DNS record
 */
export class DnsRecordTreeItem extends BaseTreeItem {
    public readonly record: DnsRecord;
    public readonly zoneId: string;
    public readonly accountId: string;

    constructor(record: DnsRecord) {
        // Format: TYPE  name  →  content  [proxy icon]
        const displayName = record.name.replace(/\.[^.]+\.[^.]+$/, '') || '@';
        const shortContent = record.content.length > 30
            ? record.content.substring(0, 27) + '...'
            : record.content;

        super(record.type, vscode.TreeItemCollapsibleState.None);

        this.record = record;
        this.zoneId = record.zoneId;
        this.accountId = record.accountId;
        this.contextValue = 'dnsRecord';

        // Use appropriate icon based on record type
        this.iconPath = this.getRecordTypeIcon(record.type);

        // Build label with proxy indicator
        let proxyIndicator = '';
        if (isProxiable(record.type)) {
            proxyIndicator = record.proxied ? ` ${PROXY_ICONS.ENABLED}` : ` ${PROXY_ICONS.DISABLED}`;
        }

        this.label = `${record.type}`;
        this.description = `${displayName} → ${shortContent}${proxyIndicator}`;

        // Rich tooltip
        this.tooltip = new vscode.MarkdownString();
        this.tooltip.appendMarkdown(`**Type:** ${record.type}\n\n`);
        this.tooltip.appendMarkdown(`**Name:** ${record.name}\n\n`);
        this.tooltip.appendMarkdown(`**Content:** \`${record.content}\`\n\n`);
        this.tooltip.appendMarkdown(`**TTL:** ${record.ttl === 1 ? 'Auto' : `${record.ttl}s`}\n\n`);
        if (isProxiable(record.type)) {
            this.tooltip.appendMarkdown(`**Proxy:** ${record.proxied ? 'Enabled 🟠' : 'Disabled ⚪'}\n\n`);
        }
        if (record.priority !== undefined) {
            this.tooltip.appendMarkdown(`**Priority:** ${record.priority}\n\n`);
        }
        this.tooltip.appendMarkdown(`**Record ID:** \`${record.id}\``);
    }

    private getRecordTypeIcon(type: string): vscode.ThemeIcon {
        switch (type) {
            case 'A':
            case 'AAAA':
                return new vscode.ThemeIcon('server');
            case 'CNAME':
                return new vscode.ThemeIcon('link');
            case 'MX':
                return new vscode.ThemeIcon('mail');
            case 'TXT':
                return new vscode.ThemeIcon('note');
            case 'NS':
                return new vscode.ThemeIcon('server-environment');
            case 'SRV':
                return new vscode.ThemeIcon('plug');
            case 'CAA':
                return new vscode.ThemeIcon('shield');
            default:
                return new vscode.ThemeIcon('symbol-interface');
        }
    }
}

/**
 * Loading placeholder item
 */
export class LoadingTreeItem extends BaseTreeItem {
    constructor() {
        super('Loading...', vscode.TreeItemCollapsibleState.None);
        this.iconPath = new vscode.ThemeIcon('loading~spin');
    }
}

/**
 * Error placeholder item
 */
export class ErrorTreeItem extends BaseTreeItem {
    constructor(message: string) {
        super(message, vscode.TreeItemCollapsibleState.None);
        this.iconPath = new vscode.ThemeIcon('error');
    }
}

/**
 * Empty state item
 */
export class EmptyTreeItem extends BaseTreeItem {
    constructor(message: string) {
        super(message, vscode.TreeItemCollapsibleState.None);
        this.iconPath = new vscode.ThemeIcon('info');
    }
}

export type TreeItemType = AccountTreeItem | ZoneTreeItem | DnsRecordTreeItem | LoadingTreeItem | ErrorTreeItem | EmptyTreeItem;
