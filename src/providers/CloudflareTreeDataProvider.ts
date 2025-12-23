import * as vscode from 'vscode';
import { StorageService, CloudflareApiService } from '../services';
import { Account, Zone, DnsRecord } from '../models';
import { CONFIG_KEYS } from '../utils';
import {
    AccountTreeItem,
    ZoneTreeItem,
    DnsRecordTreeItem,
    LoadingTreeItem,
    ErrorTreeItem,
    EmptyTreeItem,
    TreeItemType
} from './TreeItems';

/**
 * TreeDataProvider for Cloudflare DNS Manager
 * Provides three-level hierarchy: Account → Zone → DnsRecord
 */
export class CloudflareTreeDataProvider implements vscode.TreeDataProvider<TreeItemType> {
    private _onDidChangeTreeData = new vscode.EventEmitter<TreeItemType | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    // Cache for zones and records
    private zonesCache: Map<string, Zone[]> = new Map();
    private recordsCache: Map<string, DnsRecord[]> = new Map();
    private loadingAccounts: Set<string> = new Set();
    private loadingZones: Set<string> = new Set();

    constructor() { }

    /**
     * Refresh the entire tree
     */
    public refresh(): void {
        this.zonesCache.clear();
        this.recordsCache.clear();
        this._onDidChangeTreeData.fire();
    }

    /**
     * Refresh a specific account
     */
    public refreshAccount(accountId: string): void {
        this.zonesCache.delete(accountId);
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

        // Account level: show zones
        if (element instanceof AccountTreeItem) {
            return this.getZoneItems(element.account);
        }

        // Zone level: show DNS records
        if (element instanceof ZoneTreeItem) {
            return this.getDnsRecordItems(element.zone, element.accountId);
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
     * Get zone tree items for an account
     */
    private async getZoneItems(account: Account): Promise<TreeItemType[]> {
        // Check cache first
        if (this.zonesCache.has(account.id)) {
            const zones = this.zonesCache.get(account.id)!;
            return zones.map(zone => new ZoneTreeItem(zone, account.id));
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

            const apiService = new CloudflareApiService(accountWithToken.token, account.id);
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

            // Cache the zones
            this.zonesCache.set(account.id, zones);
            this.loadingAccounts.delete(account.id);

            if (zones.length === 0) {
                return [new EmptyTreeItem('No domains found')];
            }

            return zones.map(zone => new ZoneTreeItem(zone, account.id));
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
