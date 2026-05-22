// src/lib/rbac.ts
// Role-based access control for TrailBlaze CRM

import type { UserRole } from './types'

// What each role can do
const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: [
    'view_dashboard', 'view_accounts', 'manage_accounts', 'view_contacts', 'manage_contacts',
    'view_interactions', 'log_interactions', 'view_pipelines', 'manage_pipelines',
    'view_playbooks', 'activate_playbooks', 'view_sequences', 'manage_sequences',
    'view_snippets', 'manage_snippets', 'view_reports', 'view_settings',
    'manage_settings', 'manage_team', 'manage_billing', 'view_admin',
    'export_data', 'delete_account', 'update_keep_score',
    'view_analytics', 'manage_broadcasts', 'manage_api_keys', 'manage_sso', 'manage_white_label',
  ],
  account_manager: [
    'view_dashboard', 'view_accounts', 'manage_accounts', 'view_contacts', 'manage_contacts',
    'view_interactions', 'log_interactions', 'view_pipelines',
    'view_playbooks', 'activate_playbooks', 'view_sequences', 'manage_sequences',
    'view_snippets', 'manage_snippets', 'view_reports',
    'view_settings', 'update_keep_score',
    'view_analytics', 'manage_broadcasts',
  ],
  viewer: [
    'view_dashboard', 'view_accounts', 'view_contacts',
    'view_interactions', 'view_pipelines',
    'view_playbooks', 'view_sequences', 'view_snippets',
    'view_reports', 'view_settings',
    'view_analytics',
  ],
}

export function hasPermission(role: UserRole, permission: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) || false
}

export function canManage(role: UserRole): boolean {
  return role === 'admin' || role === 'account_manager'
}

export function canAdmin(role: UserRole): boolean {
  return role === 'admin'
}

// What sidebar items each role sees
export function getVisibleNavItems(role: UserRole): string[] {
  const base = ['Dashboard', 'Retention pipeline', 'Sales pipeline', 'Accounts', 'Contacts',
    'Interactions', 'Playbooks', 'Analytics', 'Reports', 'Revenue at risk', 'Help centre', 'Settings']

  if (role === 'viewer') return base

  const managerItems = [...base, 'Sequences', 'Snippets', 'Broadcasts']
  if (role === 'account_manager') return managerItems

  return managerItems // admin sees everything, super admin route is separate
}

// What settings tabs each role sees
export function getVisibleSettingsTabs(role: UserRole): string[] {
  if (role === 'admin') return ['profile', 'team', 'security', 'data', 'danger', 'api-keys', 'sso', 'white-label']
  if (role === 'account_manager') return ['profile', 'security']
  return ['profile'] // viewer
}