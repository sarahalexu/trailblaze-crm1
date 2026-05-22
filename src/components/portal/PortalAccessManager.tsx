// src/components/portal/PortalAccessManager.tsx
// Add this as a tab/section on the account detail page
// Lets account managers create and manage client portal access links

'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface PortalAccessManagerProps {
  accountId: string;
  orgId: string;
}

interface PortalLink {
  id: string;
  contact_id: string;
  contact_name: string;
  access_token: string;
  is_active: boolean;
  last_accessed_at: string | null;
  expires_at: string | null;
  permissions: {
    view_health: boolean;
    view_interactions: boolean;
    view_playbooks: boolean;
    submit_feedback: boolean;
  };
  created_at: string;
}

export default function PortalAccessManager({ accountId, orgId }: PortalAccessManagerProps) {
  const supabase = createClientComponentClient();

  const [links, setLinks] = useState<PortalLink[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Create form state
  const [selectedContactId, setSelectedContactId] = useState('');
  const [permissions, setPermissions] = useState({
    view_health: true,
    view_interactions: false,
    view_playbooks: false,
    submit_feedback: true,
  });
  const [expiresIn, setExpiresIn] = useState('never');

  useEffect(() => {
    loadData();
  }, [accountId]);

  async function loadData() {
    setLoading(true);

    // Load existing portal access links
    const { data: accessData } = await supabase
      .from('portal_access')
      .select('*, contacts(full_name)')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false });

    const mapped = (accessData || []).map((a: any) => ({
      ...a,
      contact_name: a.contacts?.full_name || 'Unknown',
    }));
    setLinks(mapped);

    // Load contacts for this account (to create new links)
    const { data: contactData } = await supabase
      .from('contacts')
      .select('id, full_name, email')
      .eq('account_id', accountId)
      .order('full_name');

    setContacts(contactData || []);
    setLoading(false);
  }

  async function createPortalLink() {
    if (!selectedContactId) return;
    setCreating(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      let expiresAt = null;
      if (expiresIn === '7d') expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      if (expiresIn === '30d') expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      if (expiresIn === '90d') expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

      const { error } = await supabase.from('portal_access').insert({
        org_id: orgId,
        account_id: accountId,
        contact_id: selectedContactId,
        is_active: true,
        expires_at: expiresAt,
        permissions,
        created_by_user_id: user.id,
      });

      if (error) throw error;

      setShowCreate(false);
      setSelectedContactId('');
      setPermissions({ view_health: true, view_interactions: false, view_playbooks: false, submit_feedback: true });
      setExpiresIn('never');
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(id: string, currentState: boolean) {
    await supabase
      .from('portal_access')
      .update({ is_active: !currentState })
      .eq('id', id);
    await loadData();
  }

  async function deleteLink(id: string) {
    if (!confirm('Delete this portal link? The client will lose access immediately.')) return;
    await supabase.from('portal_access').delete().eq('id', id);
    await loadData();
  }

  function getPortalUrl(token: string) {
    return `https://crm.trailblazeafrica.com/portal/${token}`;
  }

  function copyLink(token: string, id: string) {
    navigator.clipboard.writeText(getPortalUrl(token));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (loading) {
    return <div className="animate-pulse h-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">Client Portal Access</h3>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-xs font-medium"
        >
          + Create Portal Link
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Client Contact *
            </label>
            <select
              value={selectedContactId}
              onChange={(e) => setSelectedContactId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="">Select a contact...</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name}{c.email ? ` (${c.email})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              What can the client see?
            </label>
            <div className="space-y-1.5">
              {[
                { key: 'view_health', label: 'Account health score (KEEP)' },
                { key: 'view_interactions', label: 'Recent activity / interactions' },
                { key: 'view_playbooks', label: 'Active playbook progress' },
                { key: 'submit_feedback', label: 'Submit feedback' },
              ].map((perm) => (
                <label key={perm.key} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={(permissions as any)[perm.key]}
                    onChange={(e) =>
                      setPermissions({ ...permissions, [perm.key]: e.target.checked })
                    }
                    className="rounded border-gray-300"
                  />
                  {perm.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Link Expires
            </label>
            <select
              value={expiresIn}
              onChange={(e) => setExpiresIn(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="never">Never</option>
              <option value="7d">In 7 days</option>
              <option value="30d">In 30 days</option>
              <option value="90d">In 90 days</option>
            </select>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={createPortalLink}
              disabled={creating || !selectedContactId}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-xs font-medium"
            >
              {creating ? 'Creating...' : 'Create Link'}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 text-gray-500 hover:text-gray-700 text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Existing links */}
      {links.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <p className="text-gray-400 text-sm">
            No portal links yet. Create one to give your client a read-only view of their account.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {links.map((link) => (
            <div
              key={link.id}
              className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {link.contact_name}
                  </p>
                  <span className={`px-1.5 py-0.5 rounded text-xs ${
                    link.is_active
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                  }`}>
                    {link.is_active ? 'Active' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                  {link.last_accessed_at && (
                    <span>
                      Last viewed {new Date(link.last_accessed_at).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                  {link.expires_at && (
                    <span>
                      Expires {new Date(link.expires_at).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => copyLink(link.access_token, link.id)}
                className="px-3 py-1.5 text-xs font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded transition-colors"
              >
                {copiedId === link.id ? 'Copied!' : 'Copy Link'}
              </button>

              <button
                onClick={() => toggleActive(link.id, link.is_active)}
                className="px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700 rounded"
              >
                {link.is_active ? 'Disable' : 'Enable'}
              </button>

              <button
                onClick={() => deleteLink(link.id)}
                className="px-2 py-1.5 text-xs text-red-400 hover:text-red-600 rounded"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
