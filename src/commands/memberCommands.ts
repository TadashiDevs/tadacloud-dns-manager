import * as vscode from 'vscode';
import { StorageService } from '../services/StorageService';
import { MemberService } from '../services/MemberService';
import { CloudflareTreeDataProvider } from '../providers/CloudflareTreeDataProvider';
import { AccountTreeItem, MemberTreeItem } from '../providers/TreeItems';
import { Zone } from '../models/Zone';
import { CloudflareApiService } from '../services/CloudflareApiService';

/**
 * Register all member-related commands
 */
export function registerMemberCommands(
    context: vscode.ExtensionContext,
    treeDataProvider: CloudflareTreeDataProvider
): void {
    // Invite Member
    context.subscriptions.push(
        vscode.commands.registerCommand('tadacloud.inviteMember', async (item: AccountTreeItem) => {
            await inviteMemberCommand(item, treeDataProvider);
        })
    );

    // Edit Member Permissions
    context.subscriptions.push(
        vscode.commands.registerCommand('tadacloud.editMemberPermissions', async (item: MemberTreeItem) => {
            await editMemberPermissionsCommand(item, treeDataProvider);
        })
    );

    // Copy Member Email
    context.subscriptions.push(
        vscode.commands.registerCommand('tadacloud.copyMemberEmail', async (item: MemberTreeItem) => {
            await vscode.env.clipboard.writeText(item.member.email);
            vscode.window.showInformationMessage(`📋 Copied: ${item.member.email}`);
        })
    );

    // Resend Invitation
    context.subscriptions.push(
        vscode.commands.registerCommand('tadacloud.resendInvitation', async (item: MemberTreeItem) => {
            await resendInvitationCommand(item, treeDataProvider);
        })
    );

    // Remove Member
    context.subscriptions.push(
        vscode.commands.registerCommand('tadacloud.removeMember', async (item: MemberTreeItem) => {
            await removeMemberCommand(item, treeDataProvider);
        })
    );

    // Refresh Members
    context.subscriptions.push(
        vscode.commands.registerCommand('tadacloud.refreshMembers', async () => {
            treeDataProvider.refresh();
            vscode.window.showInformationMessage('🔄 Members list refreshed');
        })
    );
}

/**
 * Invite a new member to the account
 */
async function inviteMemberCommand(
    accountItem: AccountTreeItem,
    treeDataProvider: CloudflareTreeDataProvider
): Promise<void> {
    try {
        const storageService = StorageService.getInstance();
        const accountWithToken = await storageService.getAccountWithToken(accountItem.account.id);

        if (!accountWithToken) {
            vscode.window.showErrorMessage('❌ Account token not found');
            return;
        }

        const memberService = new MemberService(accountWithToken.token, accountItem.account.cloudflareAccountId);
        const apiService = new CloudflareApiService(accountWithToken.token, accountItem.account.cloudflareAccountId);

        // Step 1: Get email addresses
        const emailsInput = await vscode.window.showInputBox({
            prompt: 'Enter email addresses separated by comma',
            placeHolder: 'dev@company.com, client@gmail.com',
            ignoreFocusOut: true,
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'At least one email address is required';
                }
                const emails = value.split(',').map(e => e.trim());
                for (const email of emails) {
                    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
                        return `Invalid email format: ${email}`;
                    }
                }
                return null;
            }
        });

        if (!emailsInput) {
            return; // User cancelled
        }

        const emails = emailsInput.split(',').map(e => e.trim());

        // Step 2: Select scope
        const scopeOptions: vscode.QuickPickItem[] = [
            { label: '🏢 Entire Account', description: 'Access to all account resources' },
            { label: '🌐 Specific Domains', description: 'Access to selected domains only' }
        ];

        const selectedScope = await vscode.window.showQuickPick(scopeOptions, {
            placeHolder: 'Select access scope (Press Enter to confirm or Escape to cancel)',
            ignoreFocusOut: true
        });

        if (!selectedScope) {
            return; // User cancelled
        }

        const isEntireAccount = selectedScope.label.includes('Entire Account');

        // Step 3: If specific domains, let user select which ones
        let selectedZones: Zone[] = [];
        if (!isEntireAccount) {
            const zones = await apiService.getZones();

            if (zones.length === 0) {
                vscode.window.showWarningMessage('⚠️ No domains found in this account');
                return;
            }

            const zoneOptions: vscode.QuickPickItem[] = zones.map(z => ({
                label: z.name,
                description: z.status,
                picked: false
            }));

            const selectedZoneItems = await vscode.window.showQuickPick(zoneOptions, {
                placeHolder: 'Select domains (Space to select, Enter to confirm or Escape to cancel)',
                canPickMany: true,
                ignoreFocusOut: true
            });

            if (!selectedZoneItems || selectedZoneItems.length === 0) {
                vscode.window.showWarningMessage('⚠️ At least one domain must be selected');
                return;
            }

            selectedZones = zones.filter(z => selectedZoneItems.some(item => item.label === z.name));
        }

        // Step 4: Get appropriate roles based on scope
        // Import role lists from Member model
        const { ACCOUNT_ROLES, DOMAIN_ROLES } = await import('../models/Member');

        // Use account roles for entire account, domain roles for specific domains
        const appropriateRoles = isEntireAccount ? ACCOUNT_ROLES : DOMAIN_ROLES;

        // Step 5: Select roles (multi-select - toggles)
        const roleOptions: vscode.QuickPickItem[] = appropriateRoles.map(r => ({
            label: r.name,
            description: r.description,
            picked: false
        }));

        const selectedRoleItems = await vscode.window.showQuickPick(roleOptions, {
            placeHolder: isEntireAccount
                ? 'Select account roles (Space to toggle, Enter to confirm or Escape to cancel)'
                : 'Select domain roles (Space to toggle, Enter to confirm or Escape to cancel)',
            canPickMany: true,
            ignoreFocusOut: true
        });

        if (!selectedRoleItems || selectedRoleItems.length === 0) {
            vscode.window.showWarningMessage('⚠️ At least one role must be selected');
            return;
        }

        // Get role/permission group IDs based on scope
        const availableRoles = await memberService.getRoles();
        const selectedRoleIds: string[] = [];
        const matchedRoleNames: string[] = [];
        let usingZoneRoleIds = false; // Track if we're using zone-level IDs (need policies)

        for (const item of selectedRoleItems) {
            if (isEntireAccount) {
                // ACCOUNT-LEVEL: Use ACCOUNT_LEVEL_ROLE_IDS first
                const accountRoleId = MemberService.ACCOUNT_LEVEL_ROLE_IDS[item.label];

                if (accountRoleId) {
                    selectedRoleIds.push(accountRoleId);
                    matchedRoleNames.push(item.label);
                } else {
                    // Fallback to API roles
                    const apiRole = availableRoles.find(r => r.name === item.label);
                    if (apiRole) {
                        selectedRoleIds.push(apiRole.id);
                        matchedRoleNames.push(item.label);
                    }
                }
            } else {
                // ZONE-LEVEL: Use ZONE_LEVEL_ROLE_IDS first (need policies with ad-hoc)
                const zoneRoleId = MemberService.ZONE_LEVEL_ROLE_IDS[item.label] ||
                    MemberService.ZONE_LEVEL_ROLE_IDS[MemberService.DOMAIN_ROLE_MAP[item.label] || ''];

                if (zoneRoleId) {
                    selectedRoleIds.push(zoneRoleId);
                    matchedRoleNames.push(item.label);
                    usingZoneRoleIds = true;
                }
            }
        }

        if (selectedRoleIds.length === 0) {
            vscode.window.showErrorMessage('❌ Could not find any matching role IDs');
            return;
        }

        // Step 6: Add directly or send invitation?
        const addMethodOptions: vscode.QuickPickItem[] = [
            { label: '📨 Send Invitation', description: 'Member must accept via email' },
            { label: '⚡ Add Directly', description: 'Add without email confirmation' }
        ];

        const selectedMethod = await vscode.window.showQuickPick(addMethodOptions, {
            placeHolder: 'How should the member be added? (Press Enter to confirm or Escape to cancel)',
            ignoreFocusOut: true
        });

        if (!selectedMethod) {
            return; // User cancelled
        }

        const addDirectly = selectedMethod.label.includes('Add Directly');

        // Step 7: Invite all members
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Inviting ${emails.length} member(s)...`,
            cancellable: false
        }, async () => {
            const results: { email: string; success: boolean; error?: string }[] = [];

            for (const email of emails) {
                try {
                    if (!isEntireAccount && selectedZones.length > 0 && usingZoneRoleIds) {
                        // Domain-level with KNOWN IDs: use LEGACY/AD-HOC scope structure
                        // Critical: meta: { adhoc: 'true' } is required for Cloudflare to accept this
                        const resourceGroups = selectedZones.map(zone => ({
                            meta: { adhoc: 'true' },
                            scope: {
                                key: `com.cloudflare.api.account.zone.${zone.id}`,
                                objects: [{ key: '*' }]
                            }
                        }));

                        await memberService.inviteMember({
                            email,
                            status: addDirectly ? 'accepted' : 'pending',
                            policies: [{
                                access: 'allow' as const,
                                permission_groups: selectedRoleIds.map(id => ({ id })),
                                resource_groups: resourceGroups
                            }]
                        });
                    } else if (isEntireAccount) {
                        // Account-level access: use roles
                        await memberService.inviteMember({
                            email,
                            roles: selectedRoleIds,
                            status: addDirectly ? 'accepted' : 'pending'
                        });
                    } else {
                        // Fallback: use roles
                        await memberService.inviteMember({
                            email,
                            roles: selectedRoleIds,
                            status: addDirectly ? 'accepted' : 'pending'
                        });
                    }
                    results.push({ email, success: true });
                } catch (error) {
                    const message = error instanceof Error ? error.message : 'Unknown error';
                    results.push({ email, success: false, error: message });
                }
            }

            // Show results
            const successCount = results.filter(r => r.success).length;
            const failCount = results.filter(r => !r.success).length;

            if (successCount > 0 && failCount === 0) {
                const roleNames = matchedRoleNames.join(', ');
                vscode.window.showInformationMessage(
                    `✅ ${successCount} member(s) invited successfully with roles: ${roleNames}`
                );
            } else if (successCount > 0 && failCount > 0) {
                vscode.window.showWarningMessage(
                    `⚠️ ${successCount} invited, ${failCount} failed. Check output for details.`
                );
            } else {
                vscode.window.showErrorMessage(
                    `❌ Failed to invite members: ${results[0]?.error || 'Unknown error'}`
                );
            }

            // Refresh tree
            treeDataProvider.refresh();
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        vscode.window.showErrorMessage(`❌ Error: ${message}`);
    }
}

/**
 * Edit member permissions
 */
async function editMemberPermissionsCommand(
    memberItem: MemberTreeItem,
    treeDataProvider: CloudflareTreeDataProvider
): Promise<void> {
    try {
        const storageService = StorageService.getInstance();
        const accountWithToken = await storageService.getAccountWithToken(memberItem.accountId);

        if (!accountWithToken) {
            vscode.window.showErrorMessage('❌ Account token not found');
            return;
        }

        const memberService = new MemberService(accountWithToken.token, memberItem.cloudflareAccountId);
        const apiService = new CloudflareApiService(accountWithToken.token, memberItem.cloudflareAccountId);

        // Get available account roles
        const availableRoles = await memberService.getRoles();

        // Determine if member has account-level or domain-level access
        // Domain access = member has policies with permissionGroups (from policies[].permissionGroups)
        // Account access = member has roles array with entries
        let isDomainAccess = false;

        if (memberItem.member.policies && memberItem.member.policies.length > 0) {
            // Check if any policy has permissionGroups
            for (const policy of memberItem.member.policies) {
                if (policy.permissionGroups && policy.permissionGroups.length > 0) {
                    isDomainAccess = true;
                    break;
                }
            }
        }

        // For domain-access members, allow editing domains
        let selectedZones: Zone[] = [];
        let currentZoneIds: string[] = [];

        if (isDomainAccess) {
            // Extract current zone IDs from member policies
            // The zoneId is now extracted from scope.key during parsing
            for (const policy of memberItem.member.policies || []) {
                for (const rg of policy.resourceGroups || []) {
                    for (const scope of rg.scope || []) {
                        if (scope.zoneId && !currentZoneIds.includes(scope.zoneId)) {
                            currentZoneIds.push(scope.zoneId);
                        }
                    }
                }
            }

            // Get all zones for selection
            const allZones = await apiService.getZones();

            if (allZones.length === 0) {
                vscode.window.showWarningMessage('⚠️ No domains found in this account');
                return;
            }

            // Create zone options with current zones pre-selected
            const zoneOptions: vscode.QuickPickItem[] = allZones.map(z => ({
                label: z.name,
                description: currentZoneIds.includes(z.id) ? '✓ (current)' : z.status
            }));

            // Use createQuickPick for proper pre-selection
            const selectedZoneItems = await new Promise<vscode.QuickPickItem[] | undefined>((resolve) => {
                const quickPick = vscode.window.createQuickPick();
                quickPick.items = zoneOptions;
                quickPick.canSelectMany = true;
                quickPick.placeholder = `Edit domains for ${memberItem.member.email} (Space to toggle, Enter to confirm or Escape to cancel)`;
                quickPick.ignoreFocusOut = true;

                // Pre-select current zones
                quickPick.selectedItems = zoneOptions.filter(item =>
                    allZones.some(z => z.name === item.label && currentZoneIds.includes(z.id))
                );

                quickPick.onDidAccept(() => {
                    resolve([...quickPick.selectedItems]);
                    quickPick.hide();
                });

                quickPick.onDidHide(() => {
                    resolve(undefined);
                    quickPick.dispose();
                });

                quickPick.show();
            });

            if (!selectedZoneItems) {
                return; // User cancelled
            }

            if (selectedZoneItems.length === 0) {
                vscode.window.showWarningMessage('⚠️ At least one domain must be selected for domain-specific access');
                return;
            }

            selectedZones = allZones.filter(z => selectedZoneItems.some(item => item.label === z.name));
        }

        // Get current role/permission names from member
        const currentRoleNames: string[] = [];

        // From direct roles (account-level)
        if (memberItem.member.roles && memberItem.member.roles.length > 0) {
            for (const role of memberItem.member.roles) {
                if (role.name && !currentRoleNames.includes(role.name)) {
                    currentRoleNames.push(role.name);
                }
            }
        }

        // From policies (domain-specific access)
        if (memberItem.member.policies && memberItem.member.policies.length > 0) {
            for (const policy of memberItem.member.policies) {
                if (policy.permissionGroups) {
                    for (const pg of policy.permissionGroups) {
                        if (pg.name && !currentRoleNames.includes(pg.name)) {
                            currentRoleNames.push(pg.name);
                        }
                    }
                }
            }
        }

        // Import role lists based on member's access type
        const { ACCOUNT_ROLES, DOMAIN_ROLES } = await import('../models/Member');
        const appropriateRoles = isDomainAccess ? DOMAIN_ROLES : ACCOUNT_ROLES;

        // Get the names of appropriate roles for filtering
        const appropriateRoleNames = appropriateRoles.map(r => r.name);

        // Build role options - ONLY from the appropriate role list
        const roleOptions: vscode.QuickPickItem[] = [];

        // Add roles from the appropriate list, marking current ones
        for (const role of appropriateRoles) {
            const isCurrent = currentRoleNames.includes(role.name);
            roleOptions.push({
                label: role.name,
                description: isCurrent ? '✓ (current)' : role.description
            });
        }

        // Filter currentRoleNames to only include roles from appropriate list (for pre-selection)
        const currentRolesInList = currentRoleNames.filter(name => appropriateRoleNames.includes(name));

        if (roleOptions.length === 0) {
            vscode.window.showErrorMessage('❌ No roles available');
            return;
        }

        // Use createQuickPick to properly pre-select current roles
        const selectedRoleItems = await new Promise<vscode.QuickPickItem[] | undefined>((resolve) => {
            const quickPick = vscode.window.createQuickPick();
            quickPick.items = roleOptions;
            quickPick.canSelectMany = true;
            quickPick.placeholder = isDomainAccess
                ? `Edit domain roles for ${memberItem.member.email} (Space to toggle, Enter to confirm or Escape to cancel)`
                : `Edit account roles for ${memberItem.member.email} (Space to toggle, Enter to confirm or Escape to cancel)`;
            quickPick.ignoreFocusOut = true;

            // Pre-select current roles (only those that are in the appropriate list)
            quickPick.selectedItems = roleOptions.filter(item => currentRolesInList.includes(item.label));

            quickPick.onDidAccept(() => {
                resolve([...quickPick.selectedItems]);
                quickPick.hide();
            });

            quickPick.onDidHide(() => {
                resolve(undefined);
                quickPick.dispose();
            });


            quickPick.show();
        });

        if (!selectedRoleItems) {
            return; // User cancelled
        }

        if (selectedRoleItems.length === 0) {
            vscode.window.showWarningMessage('⚠️ At least one role must be selected');
            return;
        }

        // Find role/permission group IDs
        // For domain-access: use IAM permission groups (different IDs from roles!)
        // For account-access: use account roles
        const selectedRoleIds: string[] = [];
        const matchedRoleNames: string[] = [];
        let usingKnownIds = false; // Track if we're using KNOWN_PERMISSION_GROUPS

        if (isDomainAccess) {
            // Fetch IAM permission groups for domain-level policies
            const allPermissionGroups = await memberService.getPermissionGroups();

            // CRITICAL: Filter to ONLY zone-compatible permission groups
            const zonePermissionGroups = allPermissionGroups.filter(pg =>
                pg.scopes && pg.scopes.some(s => s.includes('zone'))
            );

            for (const item of selectedRoleItems) {
                // PRIORITY 1: Check ZONE_LEVEL_ROLE_IDS FIRST (most reliable for domain access)
                const zoneId = MemberService.ZONE_LEVEL_ROLE_IDS[item.label] ||
                    MemberService.ZONE_LEVEL_ROLE_IDS[MemberService.DOMAIN_ROLE_MAP[item.label] || ''];

                if (zoneId) {
                    selectedRoleIds.push(zoneId);
                    matchedRoleNames.push(item.label);
                    usingKnownIds = true;
                } else {
                    // PRIORITY 2: Only if not in ZONE, check API permission groups (fallback)
                    const pg = zonePermissionGroups.find(p =>
                        p.name === item.label ||
                        p.name === MemberService.DOMAIN_ROLE_MAP[item.label] ||
                        p.name.toLowerCase() === item.label.toLowerCase().replace('domain ', '')
                    );

                    if (pg) {
                        selectedRoleIds.push(pg.id);
                        matchedRoleNames.push(item.label);
                    }
                }
            }

            // Warn if some roles couldn't be matched
            if (selectedRoleIds.length < selectedRoleItems.length) {
                const unmatched = selectedRoleItems.filter(i => !matchedRoleNames.includes(i.label));
                vscode.window.showWarningMessage(
                    `⚠️ ${unmatched.length} role(s) not available: ${unmatched.map(i => i.label).join(', ')}`
                );
            }
        } else {
            // Use account roles for account-level access
            for (const item of selectedRoleItems) {
                const roleId = memberService.findRoleIdByName(availableRoles, item.label);
                if (roleId) {
                    selectedRoleIds.push(roleId);
                    matchedRoleNames.push(item.label);
                }
            }
        }

        // Validate that we have role IDs to send
        if (selectedRoleIds.length === 0 && selectedRoleItems.length > 0) {
            vscode.window.showErrorMessage('❌ Could not find matching role IDs in the Cloudflare API.');
            return;
        }

        // Check if anything changed
        const newRoleNames = selectedRoleItems.map(i => i.label);
        const rolesChanged =
            newRoleNames.length !== currentRolesInList.length ||
            !newRoleNames.every(name => currentRolesInList.includes(name));

        const newZoneIds = selectedZones.map(z => z.id);
        const zonesChanged = isDomainAccess && (
            newZoneIds.length !== currentZoneIds.length ||
            !newZoneIds.every(id => currentZoneIds.includes(id))
        );

        if (!rolesChanged && !zonesChanged) {
            vscode.window.showInformationMessage('ℹ️ No changes made');
            return;
        }

        // Update member
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Updating permissions for ${memberItem.member.email}...`,
            cancellable: false
        }, async () => {
            if (isDomainAccess && usingKnownIds && newZoneIds.length > 0) {
                // Domain-level with KNOWN IDs: use LEGACY policies structure
                const resourceGroups = selectedZones.map(zone => ({
                    scope: {
                        key: `com.cloudflare.api.account.zone.${zone.id}`,
                        objects: [{ key: '*' }]
                    }
                }));

                await memberService.updateMemberPolicies(
                    memberItem.member.id,
                    selectedRoleIds,
                    newZoneIds,
                    true // useLegacyFormat
                );
            } else {
                // Account-level or API IDs: use simple roles
                await memberService.updateMember(memberItem.member.id, selectedRoleIds);
            }

            const roleNames = selectedRoleItems.map(i => i.label).join(', ');
            let message = `✅ Updated permissions for ${memberItem.member.email}`;

            if (isDomainAccess && newZoneIds.length > 0) {
                const zoneNames = selectedZones.map(z => z.name).join(', ');
                message += ` | Domains: ${zoneNames}`;
            }

            vscode.window.showInformationMessage(message);

            treeDataProvider.refresh();
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        vscode.window.showErrorMessage(`❌ Error: ${message}`);
    }
}

/**
 * Resend invitation to a pending member
 */
async function resendInvitationCommand(
    memberItem: MemberTreeItem,
    treeDataProvider: CloudflareTreeDataProvider
): Promise<void> {
    if (memberItem.member.status !== 'pending') {
        vscode.window.showWarningMessage('⚠️ Can only resend invitations to pending members');
        return;
    }

    try {
        const storageService = StorageService.getInstance();
        const accountWithToken = await storageService.getAccountWithToken(memberItem.accountId);

        if (!accountWithToken) {
            vscode.window.showErrorMessage('❌ Account token not found');
            return;
        }

        const memberService = new MemberService(accountWithToken.token, memberItem.cloudflareAccountId);

        const confirm = await vscode.window.showInformationMessage(
            `Resend invitation to ${memberItem.member.email}?`,
            { modal: true },
            'Yes, Resend'
        );

        if (confirm !== 'Yes, Resend') {
            return;
        }

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Resending invitation to ${memberItem.member.email}...`,
            cancellable: false
        }, async () => {
            const roleIds = memberItem.member.roles.map(r => r.id);
            await memberService.resendInvitation(
                memberItem.member.id,
                memberItem.member.email,
                roleIds
            );

            vscode.window.showInformationMessage(
                `✅ Invitation resent to ${memberItem.member.email}`
            );

            treeDataProvider.refresh();
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        vscode.window.showErrorMessage(`❌ Error: ${message}`);
    }
}

/**
 * Remove a member from the account
 */
async function removeMemberCommand(
    memberItem: MemberTreeItem,
    treeDataProvider: CloudflareTreeDataProvider
): Promise<void> {
    try {
        const storageService = StorageService.getInstance();
        const accountWithToken = await storageService.getAccountWithToken(memberItem.accountId);

        if (!accountWithToken) {
            vscode.window.showErrorMessage('❌ Account token not found');
            return;
        }

        const memberService = new MemberService(accountWithToken.token, memberItem.cloudflareAccountId);

        const confirm = await vscode.window.showWarningMessage(
            `Are you sure you want to remove ${memberItem.member.email} from this account?`,
            { modal: true },
            'Yes, Remove'
        );

        if (confirm !== 'Yes, Remove') {
            return;
        }

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Removing ${memberItem.member.email}...`,
            cancellable: false
        }, async () => {
            await memberService.removeMember(memberItem.member.id);

            vscode.window.showInformationMessage(
                `✅ ${memberItem.member.email} has been removed from the account`
            );

            treeDataProvider.refresh();
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        vscode.window.showErrorMessage(`❌ Error: ${message}`);
    }
}
