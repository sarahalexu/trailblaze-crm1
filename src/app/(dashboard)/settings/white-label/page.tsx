// src/app/(dashboard)/settings/white-label/page.tsx
// White-label configuration - Enterprise plan only
// Custom branding: logo, colors, domain, email sender

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client'

export default function WhiteLabelPage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#2b0548');
  const [secondaryColor, setSecondaryColor] = useState('#5a1890');
  const [accentColor, setAccentColor] = useState('#00adef');
  const [customDomain, setCustomDomain] = useState('');
  const [hidePoweredBy, setHidePoweredBy] = useState(false);
  const [emailFromName, setEmailFromName] = useState('');
  const [emailFromAddress, setEmailFromAddress] = useState('');

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

    const { data: wlConfig } = await supabase
      .from('white_label_config')
      .select('*')
      .eq('org_id', userData.org_id)
      .single();

    if (wlConfig) {
      setConfig(wlConfig);
      setCompanyName(wlConfig.company_name || '');
      setLogoUrl(wlConfig.logo_url || '');
      setFaviconUrl(wlConfig.favicon_url || '');
      setPrimaryColor(wlConfig.primary_color || '#2b0548');
      setSecondaryColor(wlConfig.secondary_color || '#5a1890');
      setAccentColor(wlConfig.accent_color || '#00adef');
      setCustomDomain(wlConfig.custom_domain || '');
      setHidePoweredBy(wlConfig.hide_powered_by || false);
      setEmailFromName(wlConfig.custom_email_from_name || '');
      setEmailFromAddress(wlConfig.custom_email_from_address || '');
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

      const wlData = {
        org_id: userData.org_id,
        company_name: companyName.trim() || null,
        logo_url: logoUrl.trim() || null,
        favicon_url: faviconUrl.trim() || null,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        accent_color: accentColor,
        custom_domain: customDomain.trim() || null,
        hide_powered_by: hidePoweredBy,
        custom_email_from_name: emailFromName.trim() || null,
        custom_email_from_address: emailFromAddress.trim() || null,
        is_active: true,
      };

      if (config?.id) {
        const { error } = await supabase.from('white_label_config').update(wlData).eq('id', config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('white_label_config').insert(wlData);
        if (error) throw error;
      }

      setMessage({ type: 'success', text: 'White-label settings saved.' });
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">White Label</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
          Customize the CRM with your brand. Enterprise plan only.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-5">
        {message && (
          <div className={`p-3 rounded-lg text-sm ${
            message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700' : 'bg-red-50 dark:bg-red-900/20 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company Name</label>
          <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Your Company" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 text-sm" />
          <p className="text-xs text-gray-400 mt-1">Replaces &quot;TrailBlaze CRM&quot; throughout the app</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Logo URL</label>
            <input type="text" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Favicon URL</label>
            <input type="text" value={faviconUrl} onChange={(e) => setFaviconUrl(e.target.value)} placeholder="https://..." className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 text-sm" />
          </div>
        </div>

        {/* Color pickers */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Brand Colors</label>
          <div className="flex gap-4">
            {[
              { label: 'Primary', value: primaryColor, setter: setPrimaryColor },
              { label: 'Secondary', value: secondaryColor, setter: setSecondaryColor },
              { label: 'Accent', value: accentColor, setter: setAccentColor },
            ].map((color) => (
              <div key={color.label} className="text-center">
                <input
                  type="color"
                  value={color.value}
                  onChange={(e) => color.setter(e.target.value)}
                  className="w-12 h-12 rounded-lg border-0 cursor-pointer"
                />
                <p className="text-xs text-gray-400 mt-1">{color.label}</p>
              </div>
            ))}
          </div>

          {/* Preview */}
          <div className="mt-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-400 mb-2">Preview</p>
            <div className="flex gap-2">
              <div className="px-4 py-2 rounded text-white text-xs font-medium" style={{ backgroundColor: primaryColor }}>
                Primary Button
              </div>
              <div className="px-4 py-2 rounded text-white text-xs font-medium" style={{ backgroundColor: secondaryColor }}>
                Secondary
              </div>
              <div className="px-4 py-2 rounded text-white text-xs font-medium" style={{ backgroundColor: accentColor }}>
                Accent
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Custom Domain</label>
          <input type="text" value={customDomain} onChange={(e) => setCustomDomain(e.target.value)} placeholder="crm.yourcompany.com" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 text-sm" />
          <p className="text-xs text-gray-400 mt-1">Contact support@trailblazeafrica.com to set up DNS for your custom domain.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email From Name</label>
            <input type="text" value={emailFromName} onChange={(e) => setEmailFromName(e.target.value)} placeholder="Your Company" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email From Address</label>
            <input type="email" value={emailFromAddress} onChange={(e) => setEmailFromAddress(e.target.value)} placeholder="noreply@yourcompany.com" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 text-sm" />
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={hidePoweredBy} onChange={(e) => setHidePoweredBy(e.target.checked)} className="rounded border-gray-300" />
          <span className="text-sm text-gray-700 dark:text-gray-300">Hide &quot;Powered by TrailBlaze CRM&quot; branding</span>
        </label>

        <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium text-sm">
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
