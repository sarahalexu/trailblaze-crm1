// src/app/(dashboard)/settings/api-keys/page.tsx
// API key management - Scale plan users can create API keys for external integrations

'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  is_active: boolean;
  last_used_at: string | null;
  request_count: number;
  created_at: string;
  expires_at: string | null;
}

export default function ApiKeysPage() {
  const supabase = createClientComponentClient();

  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(['read']);
  const [creating, setCreating] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadKeys();
  }, []);

  async function loadKeys() {
    const { data } = await supabase
      .from('api_keys')
      .select('*')
      .order('created_at', { ascending: false });

    setKeys(data || []);
    setLoading(false);
  }

  async function createKey() {
    if (!newKeyName.trim()) {
      setError('Give your API key a name.');
      return;
    }

    setCreating(true);
    setError('');

    try {
      // Generate a random API key
      const rawKey = 'tb_' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      const keyPrefix = rawKey.substring(0, 10);

      // Hash the key for storage (simple hash for now)
      const encoder = new TextEncoder();
      const data = encoder.encode(rawKey);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const keyHash = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      const { data: userData } = await supabase
        .from('users')
        .select('org_id')
        .eq('auth_id', user.id)
        .single();
      if (!userData) throw new Error('User not found');

      const { error: insertErr } = await supabase.from('api_keys').insert({
        org_id: userData.org_id,
        name: newKeyName.trim(),
        key_prefix: keyPrefix,
        key_hash: keyHash,
        scopes: newKeyScopes,
        created_by_user_id: user.id,
      });

      if (insertErr) throw insertErr;

      // Show the key once
      setRevealedKey(rawKey);
      setShowCreate(false);
      setNewKeyName('');
      setNewKeyScopes(['read']);
      await loadKeys();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function revokeKey(id: string) {
    if (!confirm('Revoke this API key? Any integrations using it will stop working immediately.')) return;

    await supabase
      .from('api_keys')
      .update({ is_active: false })
      .eq('id', id);

    await loadKeys();
  }

  function toggleScope(scope: string) {
    setNewKeyScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  }

  const AVAILABLE_SCOPES = [
    { value: 'read', label: 'Read', description: 'View accounts, contacts, interactions, health scores' },
    { value: 'write', label: 'Write', description: 'Create and update accounts, contacts, interactions' },
    { value: 'delete', label: 'Delete', description: 'Delete accounts, contacts, interactions' },
    { value: 'admin', label: 'Admin', description: 'Manage team, settings, and billing' },
  ];

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">API Keys</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
            Create API keys to integrate TrailBlaze CRM with your other tools.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
        >
          + Create Key
        </button>
      </div>

      {/* Revealed key banner */}
      {revealedKey && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">
            Your API key (copy it now, it won&apos;t be shown again):
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white dark:bg-gray-800 px-3 py-2 rounded text-sm font-mono text-gray-900 dark:text-white border border-green-300 dark:border-green-700 break-all">
              {revealedKey}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(revealedKey);
              }}
              className="px-3 py-2 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 flex-shrink-0"
            >
              Copy
            </button>
          </div>
          <button
            onClick={() => setRevealedKey(null)}
            className="mt-2 text-green-600 dark:text-green-400 text-xs hover:underline"
          >
            I&apos;ve copied it, dismiss
          </button>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="mb-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create API Key</h2>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Key Name *
            </label>
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="e.g. Zapier Integration, Custom Dashboard"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Permissions
            </label>
            <div className="space-y-2">
              {AVAILABLE_SCOPES.map((scope) => (
                <label
                  key={scope.value}
                  className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    newKeyScopes.includes(scope.value)
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={newKeyScopes.includes(scope.value)}
                    onChange={() => toggleScope(scope.value)}
                    className="mt-0.5 rounded border-gray-300"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{scope.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{scope.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={createKey}
              disabled={creating}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium"
            >
              {creating ? 'Creating...' : 'Create Key'}
            </button>
            <button
              onClick={() => { setShowCreate(false); setError(''); }}
              className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* API endpoint info */}
      <div className="mb-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 dark:text-white text-sm mb-2">API Base URL</h3>
        <code className="text-sm bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded text-purple-600 dark:text-purple-400">
          https://crm.trailblazeafrica.com/api/v1
        </code>
        <p className="text-xs text-gray-400 mt-2">
          Include your API key in the Authorization header: <code className="text-gray-500">Authorization: Bearer tb_xxx...</code>
        </p>
      </div>

      {/* Keys list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : keys.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-3xl mb-2">&#128273;</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">No API keys yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((key) => (
            <div
              key={key.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm text-gray-900 dark:text-white">{key.name}</p>
                  {!key.is_active && (
                    <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 text-xs rounded">
                      Revoked
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                  <code>{key.key_prefix}......</code>
                  <span>Scopes: {(key.scopes || []).join(', ')}</span>
                  <span>{key.request_count} requests</span>
                  {key.last_used_at && (
                    <span>Last used {new Date(key.last_used_at).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
              {key.is_active && (
                <button
                  onClick={() => revokeKey(key.id)}
                  className="px-3 py-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-xs font-medium"
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
