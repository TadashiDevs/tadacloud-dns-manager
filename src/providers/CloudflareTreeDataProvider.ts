import * as vscode from 'vscode';
import { StorageService, CloudflareApiService, MemberService } from '../services';
import { Account, Zone, DnsRecord, Member } from '../models';
import { CONFIG_KEYS } from '../utils';
import {
    AccountTreeItem,
    ZoneTreeItem,
    DnsRecordTreeItem,
    LoadingTreeItem,
    ErrorTreeItem,
    EmptyTreeItem,
    TeamMembersTreeItem,
    MemberTreeItem,
    TreeItemType
} from './TreeItems';

/**
 * TreeDataProvider for Cloudflare DNS Manager
 * Provides three-level hierarchy: Account → Zone → DnsRecord
 */
export class CloudflareTreeDataProvider implements vscode.TreeDataProvider<TreeItemType> {
    private _onDidChangeTreeData = new vscode.EventEmitter<TreeItemType | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    // Cache for zones, records, and members
    private zonesCache: Map<string, Zone[]> = new Map();
    private recordsCache: Map<string, DnsRecord[]> = new Map();
    private membersCache: Map<string, Member[]> = new Map();
    private loadingAccounts: Set<string> = new Set();
    private loadingZones: Set<string> = new Set();
    private loadingMembers: Set<string> = new Set();

    constructor() { }

    /**
     * Refresh the entire tree
     */
    public refresh(): void {
        this.zonesCache.clear();
        this.recordsCache.clear();
        this.membersCache.clear();
        this._onDidChangeTreeData.fire();
    }

    /**
     * Refresh a specific account
     */
    public refreshAccount(accountId: string): void {
        this.zonesCache.delete(accountId);
        this.membersCache.delete(accountId);
        // Clear all records for zones in this account
        for (const key of this.recordsCache.keys()) {
            if (key.startsWith(accountId)) {
                this.recordsCache.delete(key);
            }
        }
        this._onDidChangeTreeData.fire();
    }

    /**
     * Refresh a specific zone
     */
    public refreshZone(accountId: string, zoneId: string): void {
        this.recordsCache.delete(`${accountId}:${zoneId}`);
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: TreeItemType): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: TreeItemType): Promise<TreeItemType[]> {
        // Root level: show accounts
        if (!element) {
            return this.getAccountItems();
        }

        // Account level: show zones and team members
        if (element instanceof AccountTreeItem) {
            return this.getZoneItems(element.account);
        }

        // Zone level: show DNS records
        if (element instanceof ZoneTreeItem) {
            return this.getDnsRecordItems(element.zone, element.accountId);
        }

        // Team Members container: show individual members
        if (element instanceof TeamMembersTreeItem) {
            return this.getMemberItems(element.accountId, element.cloudflareAccountId);
        }

        return [];
    }

    /**
     * Get all account tree items
     */
    private async getAccountItems(): Promise<TreeItemType[]> {
        try {
            const storageService = StorageService.getInstance();
            const accounts = await storageService.getAccounts();

            if (accounts.length === 0) {
                return [new EmptyTreeItem('No accounts configured. Click + to add one.')];
            }

            return accounts.map(account => new AccountTreeItem(account));
        } catch (error) {
            return [new ErrorTreeItem('Failed to load accounts')];
        }
    }

    /**
     * Get zone tree items for an account (plus Team Members)
     */
    private async getZoneItems(account: Account): Promise<TreeItemType[]> {
        // Check cache first
        if (this.zonesCache.has(account.id)) {
            const zones = this.zonesCache.get(account.id)!;
            const zoneItems = zones.map(zone => new ZoneTreeItem(zone, account.id));

            // Add Team Members node
            const memberCount = this.membersCache.get(account.id)?.length || 0;
            const teamMembersItem = new TeamMembersTreeItem(account.id, account.cloudflareAccountId, memberCount);

            return [...zoneItems, teamMembersItem];
        }

        // Check if already loading
        if (this.loadingAccounts.has(account.id)) {
            return [new LoadingTreeItem()];
        }

        try {
            this.loadingAccounts.add(account.id);

            const storageService = StorageService.getInstance();
            const accountWithToken = await storageService.getAccountWithToken(account.id);

            if (!accountWithToken) {
                return [new ErrorTreeItem('Token not found')];
            }

            const apiService = new CloudflareApiService(accountWithToken.token, account.cloudflareAccountId);
            const zones = await apiService.getZones();

            // Get record counts if enabled
            const config = vscode.workspace.getConfiguration();
            const showRecordCount = config.get<boolean>(CONFIG_KEYS.SHOW_RECORD_COUNT, true);

            if (showRecordCount) {
                await Promise.all(zones.map(async (zone) => {
                    try {
                        zone.recordCount = await apiService.getDnsRecordCount(zone.id);
                    } catch {
                        zone.recordCount = undefined;
                    }
                }));
            }

            // Try to get member count (don't fail if we can't)
            let memberCount = 0;
            try {
                const memberService = new MemberService(accountWithToken.token, account.cloudflareAccountId);
                const members = await memberService.getMembers();
                this.membersCache.set(account.id, members);
                memberCount = members.length;
            } catch {
                // Member loading failed, continue without it
                memberCount = 0;
            }

            // Cache the zones
            this.zonesCache.set(account.id, zones);
            this.loadingAccounts.delete(account.id);

            const items: TreeItemType[] = [];

            if (zones.length === 0) {
                items.push(new EmptyTreeItem('No domains found'));
            } else {
                items.push(...zones.map(zone => new ZoneTreeItem(zone, account.id)));
            }

            // Always add Team Members node
            items.push(new TeamMembersTreeItem(account.id, account.cloudflareAccountId, memberCount));

            return items;
        } catch (error) {
            this.loadingAccounts.delete(account.id);
            const message = error instanceof Error ? error.message : 'Failed to load domains';
            return [new ErrorTreeItem(message)];
        }
    }

    /**
     * Get DNS record tree items for a zone
     */
    private async getDnsRecordItems(zone: Zone, accountId: string): Promise<TreeItemType[]> {
        const cacheKey = `${accountId}:${zone.id}`;

        // Check cache first
        if (this.recordsCache.has(cacheKey)) {
            const records = this.recordsCache.get(cacheKey)!;
            return this.filterAndSortRecords(records);
        }

        // Check if already loading
        if (this.loadingZones.has(cacheKey)) {
            return [new LoadingTreeItem()];
        }

        try {
            this.loadingZones.add(cacheKey);

            const storageService = StorageService.getInstance();
            const accountWithToken = await storageService.getAccountWithToken(accountId);

            if (!accountWithToken) {
                return [new ErrorTreeItem('Token not found')];
            }

            const apiService = new CloudflareApiService(accountWithToken.token, accountId);
            const records = await apiService.getDnsRecords(zone.id);

            // Cache the records
            this.recordsCache.set(cacheKey, records);
            this.loadingZones.delete(cacheKey);

            if (records.length === 0) {
                return [new EmptyTreeItem('No DNS records')];
            }

            return this.filterAndSortRecords(records);
        } catch (error) {
            this.loadingZones.delete(cacheKey);
            const message = error instanceof Error ? error.message : 'Failed to load records';
            return [new ErrorTreeItem(message)];
        }
    }

    /**
     * Get member tree items for Team Members container
     */
    private async getMemberItems(accountId: string, cloudflareAccountId: string): Promise<TreeItemType[]> {
        // Create zoneMap from cache for displaying zone names in tooltips
        const zoneMap = new Map<string, string>();
        const cachedZones = this.zonesCache.get(accountId);
        if (cachedZones) {
            for (const zone of cachedZones) {
                zoneMap.set(zone.id, zone.name);
            }
        }

        // Check cache first
        if (this.membersCache.has(accountId)) {
            const members = this.membersCache.get(accountId)!;
            if (members.length === 0) {
                return [new EmptyTreeItem('No team members')];
            }
            return members.map(member => new MemberTreeItem(member, accountId, cloudflareAccountId, zoneMap));
        }

        // Check if already loading
        if (this.loadingMembers.has(accountId)) {
            return [new LoadingTreeItem()];
        }

        try {
            this.loadingMembers.add(accountId);

            const storageService = StorageService.getInstance();
            const accountWithToken = await storageService.getAccountWithToken(accountId);

            if (!accountWithToken) {
                return [new ErrorTreeItem('Token not found')];
            }

            const memberService = new MemberService(accountWithToken.token, cloudflareAccountId);
            const members = await memberService.getMembers();

            // Cache the members
            this.membersCache.set(accountId, members);
            this.loadingMembers.delete(accountId);

            if (members.length === 0) {
                return [new EmptyTreeItem('No team members')];
            }

            return members.map(member => new MemberTreeItem(member, accountId, cloudflareAccountId, zoneMap));
        } catch (error) {
            this.loadingMembers.delete(accountId);
            const message = error instanceof Error ? error.message : 'Failed to load members';
            return [new ErrorTreeItem(message)];
        }
    }

    /**
     * Filter and sort DNS records based on user configuration
     */
    private filterAndSortRecords(records: DnsRecord[]): DnsRecordTreeItem[] {
        const config = vscode.workspace.getConfiguration();
        const visibleTypes = config.get<string[]>(CONFIG_KEYS.VISIBLE_RECORD_TYPES, ['A', 'AAAA', 'CNAME', 'MX', 'TXT']);

        // Filter by visible types
        const filtered = records.filter(r => visibleTypes.includes(r.type));

        // Sort by type, then by name
        filtered.sort((a, b) => {
            const typeCompare = a.type.localeCompare(b.type);
            if (typeCompare !== 0) return typeCompare;
            return a.name.localeCompare(b.name);
        });

        return filtered.map(record => new DnsRecordTreeItem(record));
    }

    /**
     * Get a cached zone by ID
     */
    public getCachedZone(accountId: string, zoneId: string): Zone | undefined {
        const zones = this.zonesCache.get(accountId);
        return zones?.find(z => z.id === zoneId);
    }

    /**
     * Get a cached record by ID
     */
    public getCachedRecord(accountId: string, zoneId: string, recordId: string): DnsRecord | undefined {
        const cacheKey = `${accountId}:${zoneId}`;
        const records = this.recordsCache.get(cacheKey);
        return records?.find(r => r.id === recordId);
    }
}
