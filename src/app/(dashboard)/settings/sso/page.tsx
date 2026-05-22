// src/app/(dashboard)/settings/sso/page.tsx
// SAML/OIDC SSO configuration - Enterprise plan only

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client'

export default function SSOSettingsPage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [provider, setProvider] = useState<'saml' | 'oidc'>('saml');
  const [entityId, setEntityId] = useState('');
  const [ssoUrl, setSsoUrl] = useState('');
  const [certificate, setCertificate] = useState('');
  const [metadataUrl, setMetadataUrl] = useState('');
  const [enforceSso, setEnforceSso] = useState(false);
  const [allowedDomains, setAllowedDomains] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: userData } = await supabase
      .from('users')
      .select('org_id')
      .eq('auth_id', user.id)
      .single();
    if (!userData) return;

    const { data: ssoConfig } = await supabase
      .from('sso_config')
      .select('*')
      .eq('org_id', userData.org_id)
      .single();

    if (ssoConfig) {
      setConfig(ssoConfig);
      setProvider(ssoConfig.provider);
      setEntityId(ssoConfig.entity_id || '');
      setSsoUrl(ssoConfig.sso_url || '');
      setCertificate(ssoConfig.certificate || '');
      setMetadataUrl(ssoConfig.metadata_url || '');
      setEnforceSso(ssoConfig.enforce_sso);
      setAllowedDomains((ssoConfig.allowed_domains || []).join(', '));
    }

    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      const { data: userData } = await supabase
        .from('users')
        .select('org_id')
        .eq('auth_id', user.id)
        .single();
      if (!userData) throw new Error('User not found');

      const ssoData = {
        org_id: userData.org_id,
        provider,
        entity_id: entityId.trim() || null,
        sso_url: ssoUrl.trim() || null,
        certificate: certificate.trim() || null,
        metadata_url: metadataUrl.trim() || null,
        enforce_sso: enforceSso,
        allowed_domains: allowedDomains
          .split(',')
          .map((d) => d.trim())
          .filter(Boolean),
        is_active: !!(entityId.trim() && ssoUrl.trim()),
      };

      if (config?.id) {
        const { error } = await supabase
          .from('sso_config')
          .update(ssoData)
          .eq('id', config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('sso_config')
          .insert(ssoData);
        if (error) throw error;
      }

      setMessage({ type: 'success', text: 'SSO settings saved.' });
      await loadConfig();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-6"><div className="animate-pulse h-64 bg-gray-200 dark:bg-gray-700 rounded-lg" /></div>;
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Single Sign-On (SSO)</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
          Configure SAML or OIDC single sign-on for your organization. Enterprise plan only.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-4">
        {message && (
          <div className={`p-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
          }`}>
            {message.text}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Provider</label>
          <div className="flex gap-3">
            <button
              onClick={() => setProvider('saml')}
              className={`px-4 py-2 border rounded-lg text-sm font-medium ${
                provider === 'saml' ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700' : 'border-gray-200 dark:border-gray-700 text-gray-500'
              }`}
            >
              SAML 2.0
            </button>
            <button
              onClick={() => setProvider('oidc')}
              className={`px-4 py-2 border rounded-lg text-sm font-medium ${
                provider === 'oidc' ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700' : 'border-gray-200 dark:border-gray-700 text-gray-500'
              }`}
            >
              OpenID Connect
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Entity ID / Issuer</label>
          <input type="text" value={entityId} onChange={(e) => setEntityId(e.target.value)} placeholder="https://your-idp.com/entity-id" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 text-sm" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SSO Login URL</label>
          <input type="text" value={ssoUrl} onChange={(e) => setSsoUrl(e.target.value)} placeholder="https://your-idp.com/sso/saml" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 text-sm" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">X.509 Certificate</label>
          <textarea value={certificate} onChange={(e) => setCertificate(e.target.value)} placeholder="-----BEGIN CERTIFICATE-----" rows={4} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 text-sm font-mono" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Metadata URL (optional)</label>
          <input type="text" value={metadataUrl} onChange={(e) => setMetadataUrl(e.target.value)} placeholder="https://your-idp.com/metadata.xml" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 text-sm" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Allowed Email Domains</label>
          <input type="text" value={allowedDomains} onChange={(e) => setAllowedDomains(e.target.value)} placeholder="company.com, subsidiary.com" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 text-sm" />
          <p className="text-xs text-gray-400 mt-1">Comma-separated. Only users with these email domains can log in via SSO.</p>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={enforceSso} onChange={(e) => setEnforceSso(e.target.checked)} className="rounded border-gray-300" />
          <span className="text-sm text-gray-700 dark:text-gray-300">Enforce SSO (disable password login for all users except admins)</span>
        </label>

        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300 font-medium mb-1">Your Service Provider Details</p>
          <div className="text-xs text-blue-600 dark:text-blue-400 space-y-0.5">
            <p>ACS URL: <code>https://crm.trailblazeafrica.com/api/auth/sso/callback</code></p>
            <p>Entity ID: <code>https://crm.trailblazeafrica.com</code></p>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium text-sm">
          {saving ? 'Saving...' : 'Save SSO Settings'}
        </button>
      </div>
    </div>
  );
}
