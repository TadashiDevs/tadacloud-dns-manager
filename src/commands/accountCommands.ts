import * as vscode from 'vscode';
import { StorageService, CloudflareApiService } from '../services';
import { CloudflareTreeDataProvider } from '../providers';
import { isValidApiToken } from '../utils';

/**
 * Show instructions on how to create a Cloudflare API token
 */
async function showTokenInstructions(): Promise<void> {
    const result = await vscode.window.showInformationMessage(
        '🔑 How to create a Cloudflare API Token:\n\n' +
        '1. Go to Cloudflare Dashboard → Profile → API Tokens\n' +
        '2. Click "Create Token" → "Create Custom Token"\n' +
        '3. Set these 3 permissions:\n' +
        '   • Account → Account Settings → Read\n' +
        '   • Zone → Zone → Edit\n' +
        '   • Zone → DNS → Edit\n' +
        '4. Resources:\n' +
        '   • Account Resources: Include → Your specific account\n' +
        '   • Zone Resources: Include → All zones\n' +
        '5. Client IP Filtering: Leave empty (do not add anything)\n' +
        '6. TTL: Set Start Date to today and leave End Date empty\n' +
        '7. Copy your API Token and your Account ID\n' +
        '   (Account ID is on the right sidebar of your Dashboard)\n\n' +
        '🔒 Your credentials are encrypted and stored securely\n' +
        '   in your OS keychain via VS Code SecretStorage.\n\n' +
        '⚠️ Important: Both API Token and Account ID are required!\n' +
        '⚠️ Do NOT use Global API Key - use API Token only!',
        { modal: true },
        'Open Cloudflare Dashboard',
        'I have my credentials'
    );

    if (result === 'Open Cloudflare Dashboard') {
        await vscode.env.openExternal(
            vscode.Uri.parse('https://dash.cloudflare.com/profile/api-tokens')
        );
    }
}

/**
 * Command: Add a new Cloudflare account
 */
export async function addAccount(treeDataProvider: CloudflareTreeDataProvider): Promise<void> {
    // Ask if user needs help getting a token
    const needsHelp = await vscode.window.showQuickPick(
        [
            { label: '$(key) I have my API Token & Account ID', description: 'Continue to add account', value: 'continue' },
            { label: '$(question) How do I get these?', description: 'Show instructions', value: 'help' }
        ],
        {
            title: 'Add Cloudflare Account',
            placeHolder: 'Do you have your Cloudflare API Token and Account ID ready?'
        }
    );

    if (!needsHelp) {
        return;
    }

    if (needsHelp.value === 'help') {
        await showTokenInstructions();
    }

    // Step 1: Get account name
    const name = await vscode.window.showInputBox({
        title: 'Add Cloudflare Account (Step 1/3)',
        prompt: 'Enter a friendly name for this account',
        placeHolder: 'e.g., My Company',
        ignoreFocusOut: true,
        validateInput: (value) => {
            if (!value || value.trim().length === 0) {
                return 'Account name is required';
            }
            if (value.length > 50) {
                return 'Account name must be 50 characters or less';
            }
            return null;
        }
    });

    if (!name) {
        return; // User cancelled
    }

    // Step 2: Get Cloudflare Account ID
    const cloudflareAccountId = await vscode.window.showInputBox({
        title: 'Add Cloudflare Account (Step 2/3)',
        prompt: 'Paste your Cloudflare Account ID (found on Dashboard sidebar)',
        placeHolder: 'e.g., 1a2b3c4d5e6f7g8h9i0j...',
        ignoreFocusOut: true,
        validateInput: (value) => {
            if (!value || value.trim().length === 0) {
                return 'Account ID is required';
            }
            if (value.trim().length < 10) {
                return 'Account ID seems too short. Check your Cloudflare Dashboard sidebar.';
            }
            return null;
        }
    });

    if (!cloudflareAccountId) {
        return; // User cancelled
    }

    // Step 3: Get API token
    const token = await vscode.window.showInputBox({
        title: 'Add Cloudflare Account (Step 3/3)',
        prompt: 'Paste your Cloudflare API Token (NOT Global API Key)',
        placeHolder: 'API Token with Account.Read, Zone.Edit, DNS.Edit permissions',
        password: true,
        ignoreFocusOut: true,
        validateInput: (value) => {
            if (!value || value.trim().length === 0) {
                return 'API token is required';
            }
            if (value.trim().length < 20) {
                return 'Token seems too short. Make sure you\'re using an API Token.';
            }
            return null;
        }
    });

    if (!token) {
        return; // User cancelled
    }

    // Clean values
    const cleanToken = token.trim();
    const cleanAccountId = cloudflareAccountId.trim();

    // Validate token with Cloudflare API
    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: 'Validating API token...',
            cancellable: false
        },
        async () => {
            try {
                const apiService = new CloudflareApiService(cleanToken, cleanAccountId);
                const isValid = await apiService.verifyToken();

                if (!isValid) {
                    const action = await vscode.window.showErrorMessage(
                        'Invalid API Token. Common issues:\n' +
                        '• Using Global API Key instead of API Token\n' +
                        '• Token doesn\'t have required permissions\n' +
                        '• Token has expired or been revoked',
                        'Show Instructions',
                        'Try Again'
                    );

                    if (action === 'Show Instructions') {
                        await showTokenInstructions();
                    }
                    return;
                }

                // Save account with Cloudflare Account ID
                const storageService = StorageService.getInstance();
                const account = await storageService.addAccount(name.trim(), cleanToken, cleanAccountId);

                // Refresh tree
                treeDataProvider.refresh();

                vscode.window.showInformationMessage(`Account "${account.name}" added successfully!`);
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                vscode.window.showErrorMessage(`Failed to add account: ${message}`);
            }
        }
    );
}

/**
 * Command: Rename an account
 */
export async function renameAccount(
    treeDataProvider: CloudflareTreeDataProvider,
    accountId: string,
    currentName: string
): Promise<void> {
    const newName = await vscode.window.showInputBox({
        title: 'Rename Account',
        prompt: 'Enter a new name for this account',
        value: currentName,
        validateInput: (value) => {
            if (!value || value.trim().length === 0) {
                return 'Account name is required';
            }
            if (value.length > 50) {
                return 'Account name must be 50 characters or less';
            }
            return null;
        }
    });

    if (!newName || newName === currentName) {
        return;
    }

    try {
        const storageService = StorageService.getInstance();
        await storageService.updateAccountName(accountId, newName.trim());
        treeDataProvider.refresh();
        vscode.window.showInformationMessage(`Account renamed to "${newName.trim()}"`);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        vscode.window.showErrorMessage(`Failed to rename account: ${message}`);
    }
}

/**
 * Command: Update API token for an account
 */
export async function updateToken(
    treeDataProvider: CloudflareTreeDataProvider,
    accountId: string
): Promise<void> {
    const newToken = await vscode.window.showInputBox({
        title: 'Update API Token',
        prompt: 'Enter your new Cloudflare API Token',
        password: true,
        validateInput: (value) => {
            if (!value || value.trim().length === 0) {
                return 'API token is required';
            }
            if (!isValidApiToken(value)) {
                return 'Invalid API token format';
            }
            return null;
        }
    });

    if (!newToken) {
        return;
    }

    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: 'Validating new token...',
            cancellable: false
        },
        async () => {
            try {
                const apiService = new CloudflareApiService(newToken, accountId);
                const isValid = await apiService.verifyToken();

                if (!isValid) {
                    vscode.window.showErrorMessage('Invalid API Token. Please check your token and try again.');
                    return;
                }

                const storageService = StorageService.getInstance();
                await storageService.updateAccountToken(accountId, newToken);
                treeDataProvider.refreshAccount(accountId);
                vscode.window.showInformationMessage('API token updated successfully!');
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                vscode.window.showErrorMessage(`Failed to update token: ${message}`);
            }
        }
    );
}

/**
 * Command: Delete an account
 */
export async function deleteAccount(
    treeDataProvider: CloudflareTreeDataProvider,
    accountId: string,
    accountName: string
): Promise<void> {
    const confirmation = await vscode.window.showWarningMessage(
        `Are you sure you want to delete "${accountName}"?\n\nThis will remove the account from this extension only. Your Cloudflare data is safe.`,
        { modal: true },
        'Delete Account'
    );

    if (confirmation !== 'Delete Account') {
        return;
    }

    try {
        const storageService = StorageService.getInstance();
        await storageService.deleteAccount(accountId);
        treeDataProvider.refresh();
        vscode.window.showInformationMessage(`Account "${accountName}" deleted.`);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        vscode.window.showErrorMessage(`Failed to delete account: ${message}`);
    }
}

/**
 * Cloudflare Plans - shown after domain is successfully added
 */
const CLOUDFLARE_PLANS = [
    {
        label: '$(check) Free Plan',
        description: 'Continue with Free ($0/month)',
        detail: 'Global CDN, Universal SSL, DDoS Protection, 3 Page Rules - Perfect for most websites',
        value: 'free'
    },
    {
        label: '$(star-full) Upgrade to Pro',
        description: '$20/month - Opens Cloudflare to complete upgrade',
        detail: 'Everything in Free + WAF, Image Optimization, 20 Page Rules',
        value: 'pro'
    },
    {
        label: '$(rocket) Upgrade to Business',
        description: '$200/month - Opens Cloudflare to complete upgrade',
        detail: 'Everything in Pro + 100% Uptime SLA, 50 Page Rules, Priority Support',
        value: 'business'
    },
    {
        label: '$(briefcase) Upgrade to Enterprise',
        description: 'Custom pricing - Opens Cloudflare to contact sales',
        detail: 'Custom solutions, 24/7 Support, Dedicated Account Team',
        value: 'enterprise'
    }
];

/**
 * Command: Add a domain to Cloudflare
 * Flow: Domain input → Confirmation → API call → Plan selection → Nameservers
 */
export async function migrateDomain(
    treeDataProvider: CloudflareTreeDataProvider,
    accountId: string,
    accountName: string
): Promise<void> {
    // Step 1: Get domain name
    const domainName = await vscode.window.showInputBox({
        title: `Add Domain to Cloudflare (${accountName})`,
        prompt: 'Enter the domain name to add (e.g., example.com)',
        placeHolder: 'example.com',
        ignoreFocusOut: true,
        validateInput: (value) => {
            if (!value || value.trim().length === 0) {
                return 'Domain name is required';
            }
            // Basic domain validation
            const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
            if (!domainRegex.test(value.trim())) {
                return 'Please enter a valid domain name (e.g., example.com)';
            }
            return null;
        }
    });

    if (!domainName) {
        return;
    }

    // Step 2: Confirm before API call
    const detailText = `Are you sure you want to add "${domainName}" to Cloudflare?\n\nThis will:\n• Import DNS records automatically (Note: Changes will only be visible locally until the domain is activated)\n• Assign unique Cloudflare nameservers\n• You'll need to update NS records at your registrar (Namecheap, GoDaddy, etc.)`;

    const confirm = await vscode.window.showInformationMessage(detailText, { modal: true }, 'Yes, Add Domain');

    if (confirm !== 'Yes, Add Domain') {
        return;
    }

    // Step 3: Add domain to Cloudflare API
    let nameServers: string[] = [];
    let domainStatus: string = 'pending';

    const success = await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: `Adding ${domainName} to Cloudflare...`,
            cancellable: false
        },
        async (): Promise<boolean> => {
            try {
                const storageService = StorageService.getInstance();
                const accountWithToken = await storageService.getAccountWithToken(accountId);

                if (!accountWithToken) {
                    throw new Error('Account token not found');
                }

                // Validate that cloudflareAccountId is configured
                if (!accountWithToken.cloudflareAccountId) {
                    vscode.window.showErrorMessage(
                        'Cloudflare Account ID is not configured. Please delete this account and add it again with your Account ID.'
                    );
                    return false;
                }

                // Step 3a: Verify domain exists via RDAP (with 3 second timeout)
                const rdapUrl = `https://rdap.org/domain/${domainName.trim()}`;
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 3000);

                    const rdapResponse = await fetch(rdapUrl, {
                        method: 'GET',
                        signal: controller.signal,
                        redirect: 'follow'
                    });

                    clearTimeout(timeoutId);

                    // If RDAP returns 404, domain is not registered
                    if (rdapResponse.status === 404) {
                        vscode.window.showErrorMessage(
                            `Error: The domain "${domainName}" does not appear to be registered on the global network. Please ensure you have purchased it before attempting to add it.`
                        );
                        return false;
                    }
                    // If 200, domain exists - continue to Cloudflare
                    // For any other status (500, etc.), ignore and proceed
                } catch (rdapError) {
                    // RDAP timeout or network error - ignore and proceed to Cloudflare
                    console.log('RDAP verification skipped due to error:', rdapError);
                }

                // Step 3b: Add domain to Cloudflare
                const apiService = new CloudflareApiService(accountWithToken.token, accountWithToken.cloudflareAccountId);
                const result = await apiService.addZone(domainName.trim());

                // Store nameservers for later
                nameServers = result.nameServers;
                domainStatus = result.status;

                // Refresh the tree to show the new domain
                treeDataProvider.refreshAccount(accountId);

                return true;
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';

                // Handle Cloudflare specific errors (format: CF_ERROR:code:message)
                if (message.startsWith('CF_ERROR:')) {
                    const parts = message.split(':');
                    const errorMsg = parts.slice(2).join(':');
                    vscode.window.showErrorMessage(`Failed to add domain: ${errorMsg}`);
                    return false;
                }

                // Non-Cloudflare errors (network, HTTP, etc.)
                vscode.window.showErrorMessage(`Failed to add domain: ${message}`);
                return false;
            }
        }
    );

    // If API call failed, stop here - don't show plans or nameservers
    if (!success) {
        return;
    }

    // Step 4: Domain added successfully! Show plan selection
    const selectedPlan = await vscode.window.showQuickPick(CLOUDFLARE_PLANS, {
        title: `✅ Domain "${domainName}" added! Choose your plan`,
        placeHolder: 'Select Free to continue, or upgrade to a paid plan',
        ignoreFocusOut: true
    });

    // If user cancelled plan selection, still show nameservers (domain is already added)
    if (!selectedPlan) {
        // Fall through to show nameservers
    } else if (selectedPlan.value !== 'free') {
        // User wants to upgrade - open Cloudflare dashboard
        const openDashboard = await vscode.window.showInformationMessage(
            `To upgrade to ${selectedPlan.label.replace(/\$\([^)]+\)\s*/, '')}, ` +
            `you need to complete the process on Cloudflare's website.\n\n` +
            `Your domain is already added with the Free plan. ` +
            `Click "Open Cloudflare" to upgrade.`,
            { modal: true },
            'Open Cloudflare',
            'Continue with Free'
        );

        if (openDashboard === 'Open Cloudflare') {
            await vscode.env.openExternal(
                vscode.Uri.parse(`https://dash.cloudflare.com/?to=/:account/${domainName.trim()}/`)
            );
        }
    }

    // Step 5: Show persistent nameserver copy dialog
    // This is MANDATORY - user cannot proceed without seeing this
    if (nameServers.length > 0) {
        await showNameserverCopyDialog(domainName, domainStatus, nameServers);
    } else {
        vscode.window.showWarningMessage(
            `Domain "${domainName}" was added but no nameservers were returned. ` +
            `Please check the Cloudflare dashboard for nameserver information.`
        );
    }
}

/**
 * Shows a persistent QuickPick dialog for copying nameservers one by one
 * The dialog stays open until the user presses ESC or clicks Done
 * CRITICAL: ignoreFocusOut keeps dialog open when switching to browser
 */
async function showNameserverCopyDialog(
    domainName: string,
    status: string,
    nameServers: string[]
): Promise<void> {
    const statusIcon = status === 'pending' ? '🟡' : '🟢';
    const statusText = status === 'pending' ? 'Pending - Update nameservers to activate' : 'Active';

    // Create QuickPick items for each nameserver
    const items: vscode.QuickPickItem[] = nameServers.map((ns, index) => ({
        label: `$(server) ${ns}`,
        description: `Nameserver ${index + 1} - Click to copy`,
        detail: ''
    }));

    // Add separator and action items
    items.push(
        { label: '', kind: vscode.QuickPickItemKind.Separator },
        {
            label: '$(copy) Copy All Nameservers',
            description: 'Copy both nameservers at once',
            detail: ''
        },
        {
            label: '$(link-external) Open Registrar Guide',
            description: 'Learn how to update nameservers',
            detail: ''
        },
        { label: '', kind: vscode.QuickPickItemKind.Separator },
        {
            label: '$(check) Done - I\'ve updated my nameservers',
            description: 'Close this dialog',
            detail: ''
        }
    );

    // Persistent loop - keeps showing the dialog until user presses ESC or clicks Done
    while (true) {
        const selected = await vscode.window.showQuickPick(items, {
            title: `${statusIcon} ${statusText} | Copy nameservers for "${domainName}"`,
            placeHolder: '⚠️ IMPORTANT: Update these nameservers at your registrar. Click to copy, press ESC when done.',
            ignoreFocusOut: true // CRITICAL: Keeps dialog open when switching windows
        });

        // User pressed ESC or closed the dialog
        if (!selected) {
            await showFinalReminder(domainName, nameServers);
            break;
        }

        // User clicked "Done"
        if (selected.label.includes('Done')) {
            await showFinalReminder(domainName, nameServers);
            break;
        }

        // User clicked "Open Registrar Guide"
        if (selected.label.includes('Registrar Guide')) {
            await vscode.env.openExternal(
                vscode.Uri.parse('https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/')
            );
            continue; // Re-show dialog
        }

        // User clicked "Copy All Nameservers"
        if (selected.label.includes('Copy All')) {
            await vscode.env.clipboard.writeText(nameServers.join('\n'));
            vscode.window.setStatusBarMessage(`✅ Copied all nameservers to clipboard!`, 3000);
            continue; // Re-show dialog
        }

        // User clicked a specific nameserver - copy it
        const nameserver = selected.label.replace('$(server) ', '');
        await vscode.env.clipboard.writeText(nameserver);
        vscode.window.setStatusBarMessage(`✅ Copied: ${nameserver}`, 3000);

        // Continue the loop - the dialog will reappear
    }
}

/**
 * Shows a final reminder about updating nameservers
 */
async function showFinalReminder(domainName: string, nameServers: string[]): Promise<void> {
    const action = await vscode.window.showInformationMessage(
        `⚠️ Remember: "${domainName}" will NOT work until you update your nameservers!\n\n` +
        `Go to your domain registrar (Namecheap, GoDaddy, etc.) and set:\n` +
        `• ${nameServers.join('\n• ')}\n\n` +
        `It may take 24-48 hours for changes to propagate.`,
        { modal: true },
        'Copy Nameservers',
        'Open Guide',
        'OK, I understand'
    );

    if (action === 'Copy Nameservers') {
        await vscode.env.clipboard.writeText(nameServers.join('\n'));
        vscode.window.showInformationMessage('✅ Nameservers copied to clipboard!');
    } else if (action === 'Open Guide') {
        await vscode.env.openExternal(
            vscode.Uri.parse('https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/')
        );
    }
}

