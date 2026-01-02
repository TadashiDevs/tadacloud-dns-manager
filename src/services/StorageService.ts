import * as vscode from 'vscode';
import { Account, AccountWithToken } from '../models';
import { STORAGE_KEYS, generateUUID } from '../utils';

/**
 * Internal account structure stored in globalState (no sensitive data)
 */
interface StoredAccount {
    id: string;
    name: string;
    // cloudflareAccountId is now in SecretStorage, but we keep it here for legacy migration
    cloudflareAccountId?: string;
}

/**
 * Service for managing secure storage of accounts and API tokens
 * All sensitive data (API Token and Account ID) is stored in SecretStorage (encrypted)
 */
export class StorageService {
    private static instance: StorageService;
    private secretStorage: vscode.SecretStorage;
    private globalState: vscode.Memento;

    private constructor(context: vscode.ExtensionContext) {
        this.secretStorage = context.secrets;
        this.globalState = context.globalState;
    }

    /**
     * Initialize the storage service (singleton)
     */
    public static initialize(context: vscode.ExtensionContext): StorageService {
        if (!StorageService.instance) {
            StorageService.instance = new StorageService(context);
            // Run migration on startup
            StorageService.instance.migrateToSecretStorage();
        }
        return StorageService.instance;
    }

    /**
     * Get the storage service instance
     */
    public static getInstance(): StorageService {
        if (!StorageService.instance) {
            throw new Error('StorageService not initialized. Call initialize() first.');
        }
        return StorageService.instance;
    }

    /**
     * Migrate cloudflareAccountId from globalState to SecretStorage
     * This runs automatically on extension startup
     */
    private async migrateToSecretStorage(): Promise<void> {
        const storedAccounts = this.globalState.get<StoredAccount[]>(STORAGE_KEYS.ACCOUNTS, []);
        let needsUpdate = false;

        for (const account of storedAccounts) {
            // Check if cloudflareAccountId exists in globalState (legacy)
            if (account.cloudflareAccountId) {
                // Move to SecretStorage
                await this.secretStorage.store(
                    `tadacloud.cfAccountId.${account.id}`,
                    account.cloudflareAccountId
                );
                // Remove from the account object
                delete account.cloudflareAccountId;
                needsUpdate = true;
            }
        }

        // Update globalState without the sensitive data
        if (needsUpdate) {
            await this.globalState.update(STORAGE_KEYS.ACCOUNTS, storedAccounts);
            console.log('TadaCloud: Migrated cloudflareAccountId to SecretStorage');
        }
    }

    /**
     * Get all stored accounts (without sensitive data)
     */
    public async getAccounts(): Promise<Account[]> {
        const storedAccounts = this.globalState.get<StoredAccount[]>(STORAGE_KEYS.ACCOUNTS, []);
        const accounts: Account[] = [];

        for (const stored of storedAccounts) {
            // Get cloudflareAccountId from SecretStorage
            const cloudflareAccountId = await this.secretStorage.get(`tadacloud.cfAccountId.${stored.id}`);
            accounts.push({
                id: stored.id,
                name: stored.name,
                cloudflareAccountId: cloudflareAccountId || ''
            });
        }

        return accounts;
    }

    /**
     * Get an account with its token and cloudflareAccountId
     */
    public async getAccountWithToken(accountId: string): Promise<AccountWithToken | undefined> {
        const storedAccounts = this.globalState.get<StoredAccount[]>(STORAGE_KEYS.ACCOUNTS, []);
        const storedAccount = storedAccounts.find(a => a.id === accountId);

        if (!storedAccount) {
            return undefined;
        }

        // Get both secrets
        const token = await this.secretStorage.get(`tadacloud.token.${accountId}`);
        const cloudflareAccountId = await this.secretStorage.get(`tadacloud.cfAccountId.${accountId}`);

        if (!token) {
            return undefined;
        }

        return {
            id: storedAccount.id,
            name: storedAccount.name,
            cloudflareAccountId: cloudflareAccountId || '',
            token
        };
    }

    /**
     * Add a new account
     * Both token and cloudflareAccountId are stored in SecretStorage (encrypted)
     */
    public async addAccount(name: string, token: string, cloudflareAccountId: string): Promise<Account> {
        const id = generateUUID();

        // Store only non-sensitive data in globalState
        const storedAccount: StoredAccount = { id, name };
        const storedAccounts = this.globalState.get<StoredAccount[]>(STORAGE_KEYS.ACCOUNTS, []);
        storedAccounts.push(storedAccount);
        await this.globalState.update(STORAGE_KEYS.ACCOUNTS, storedAccounts);

        // Store sensitive data in SecretStorage (encrypted by OS)
        await this.secretStorage.store(`tadacloud.token.${id}`, token);
        await this.secretStorage.store(`tadacloud.cfAccountId.${id}`, cloudflareAccountId);

        return { id, name, cloudflareAccountId };
    }

    /**
     * Update an account's name
     */
    public async updateAccountName(accountId: string, newName: string): Promise<void> {
        const storedAccounts = this.globalState.get<StoredAccount[]>(STORAGE_KEYS.ACCOUNTS, []);
        const accountIndex = storedAccounts.findIndex(a => a.id === accountId);

        if (accountIndex === -1) {
            throw new Error('Account not found');
        }

        storedAccounts[accountIndex].name = newName;
        await this.globalState.update(STORAGE_KEYS.ACCOUNTS, storedAccounts);
    }

    /**
     * Update an account's API token
     */
    public async updateAccountToken(accountId: string, newToken: string): Promise<void> {
        await this.secretStorage.store(`tadacloud.token.${accountId}`, newToken);
    }

    /**
     * Delete an account and all its secrets
     */
    public async deleteAccount(accountId: string): Promise<void> {
        // Remove from accounts list
        const storedAccounts = this.globalState.get<StoredAccount[]>(STORAGE_KEYS.ACCOUNTS, []);
        const filteredAccounts = storedAccounts.filter(a => a.id !== accountId);
        await this.globalState.update(STORAGE_KEYS.ACCOUNTS, filteredAccounts);

        // Delete all secrets for this account
        await this.secretStorage.delete(`tadacloud.token.${accountId}`);
        await this.secretStorage.delete(`tadacloud.cfAccountId.${accountId}`);
    }

    /**
     * Get token for an account
     */
    public async getToken(accountId: string): Promise<string | undefined> {
        return this.secretStorage.get(`tadacloud.token.${accountId}`);
    }

    /**
     * Get Cloudflare Account ID for an account
     */
    public async getCloudflareAccountId(accountId: string): Promise<string | undefined> {
        return this.secretStorage.get(`tadacloud.cfAccountId.${accountId}`);
    }
}

