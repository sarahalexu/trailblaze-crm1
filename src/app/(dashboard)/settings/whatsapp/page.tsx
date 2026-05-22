// src/app/(dashboard)/settings/whatsapp/page.tsx
// WhatsApp integration settings page
// Allows org admins to connect their WhatsApp Business API credentials

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client'

export default function WhatsAppSettingsPage() {
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const [isConnected, setIsConnected] = useState(false);
  const [config, setConfig] = useState<any>(null);

  // Form fields
  const [accessToken, setAccessToken] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [businessAccountId, setBusinessAccountId] = useState('');

  // Status messages
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    phone_display?: string;
    business_name?: string;
    error?: string;
  } | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('org_id')
        .eq('auth_id', user.id)
        .single();

      if (!userData) return;

      const { data: waConfig } = await supabase
        .from('whatsapp_config')
        .select('*')
        .eq('org_id', userData.org_id)
        .single();

      if (waConfig) {
        setConfig(waConfig);
        setIsConnected(true);
        setAccessToken(waConfig.access_token);
        setPhoneNumberId(waConfig.phone_number_id);
        setBusinessAccountId(waConfig.business_account_id);
      }
    } catch (err) {
      console.error('Error loading config:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    setMessage(null);

    try {
      const res = await fetch('/api/whatsapp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: accessToken,
          phone_number_id: phoneNumberId,
        }),
      });

      const result = await res.json();
      setTestResult(result);

      if (result.success) {
        setMessage({ type: 'success', text: 'Connection successful! You can now save your settings.' });
      } else {
        setMessage({ type: 'error', text: `Connection failed: ${result.error}` });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    if (!accessToken || !phoneNumberId || !businessAccountId) {
      setMessage({ type: 'error', text: 'All three fields are required.' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('org_id')
        .eq('auth_id', user.id)
        .single();

      if (!userData) return;

      const configData = {
        org_id: userData.org_id,
        access_token: accessToken.trim(),
        phone_number_id: phoneNumberId.trim(),
        business_account_id: businessAccountId.trim(),
        is_active: true,
        is_verified: testResult?.success || false,
        display_phone_number: testResult?.phone_display || null,
        business_name: testResult?.business_name || null,
        connected_by_user_id: user.id,
      };

      if (isConnected && config?.id) {
        // Update existing
        const { error } = await supabase
          .from('whatsapp_config')
          .update(configData)
          .eq('id', config.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('whatsapp_config')
          .insert(configData);

        if (error) throw error;
      }

      setIsConnected(true);
      setMessage({ type: 'success', text: 'WhatsApp settings saved successfully!' });
      await loadConfig();
    } catch (err: any) {
      setMessage({ type: 'error', text: `Failed to save: ${err.message}` });
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm('Are you sure you want to disconnect WhatsApp? This will stop all WhatsApp sequences and messaging.')) {
      return;
    }

    setDisconnecting(true);

    try {
      if (config?.id) {
        const { error } = await supabase
          .from('whatsapp_config')
          .update({ is_active: false })
          .eq('id', config.id);

        if (error) throw error;
      }

      setIsConnected(false);
      setConfig(null);
      setAccessToken('');
      setPhoneNumberId('');
      setBusinessAccountId('');
      setTestResult(null);
      setMessage({ type: 'info', text: 'WhatsApp disconnected.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: `Failed to disconnect: ${err.message}` });
    } finally {
      setDisconnecting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-96" />
          <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          WhatsApp Integration
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Connect your WhatsApp Business account to send messages, run sequences, and chat with contacts directly from the CRM.
        </p>
      </div>

      {/* Status badge */}
      {isConnected && config?.is_verified && (
        <div className="mb-6 flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          <div>
            <p className="text-green-800 dark:text-green-300 font-medium">
              Connected
              {config.display_phone_number && ` - ${config.display_phone_number}`}
            </p>
            {config.business_name && (
              <p className="text-green-600 dark:text-green-400 text-sm">
                {config.business_name}
              </p>
            )}
          </div>
        </div>
      )}

      {isConnected && !config?.is_verified && (
        <div className="mb-6 flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="w-3 h-3 bg-yellow-500 rounded-full" />
          <p className="text-yellow-800 dark:text-yellow-300 font-medium">
            Credentials saved but not yet verified. Click &quot;Test Connection&quot; below.
          </p>
        </div>
      )}

      {/* Setup guide */}
      {!isConnected && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">
            How to get your credentials
          </h3>
          <ol className="text-blue-700 dark:text-blue-400 text-sm space-y-2 list-decimal list-inside">
            <li>
              Go to{' '}
              <a
                href="https://developers.facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                developers.facebook.com
              </a>
              {' '}and create or select your app
            </li>
            <li>Add the WhatsApp product to your app</li>
            <li>Go to WhatsApp &gt; API Setup to find your Phone Number ID and Business Account ID</li>
            <li>
              Create a System User in Business Settings &gt; System Users to get a permanent Access Token
              (with whatsapp_business_messaging and whatsapp_business_management permissions)
            </li>
            <li>Paste all three values below and click Test Connection</li>
          </ol>
        </div>
      )}

      {/* Credentials form */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Access Token
          </label>
          <input
            type="password"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            placeholder="EAAxxxxxxx..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">
            Your permanent system user access token from Meta Business Settings
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Phone Number ID
          </label>
          <input
            type="text"
            value={phoneNumberId}
            onChange={(e) => setPhoneNumberId(e.target.value)}
            placeholder="123456789012345"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">
            Found in WhatsApp &gt; API Setup in your Meta Developer dashboard
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Business Account ID
          </label>
          <input
            type="text"
            value={businessAccountId}
            onChange={(e) => setBusinessAccountId(e.target.value)}
            placeholder="123456789012345"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">
            Found on the same page as Phone Number ID
          </p>
        </div>

        {/* Status message */}
        {message && (
          <div
            className={`p-3 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                : message.type === 'error'
                ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Test result details */}
        {testResult?.success && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-sm text-green-700 dark:text-green-300">
              <span className="font-medium">Phone:</span> {testResult.phone_display || 'N/A'}
            </p>
            <p className="text-sm text-green-700 dark:text-green-300">
              <span className="font-medium">Business:</span> {testResult.business_name || 'N/A'}
            </p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={handleTest}
            disabled={testing || !accessToken || !phoneNumberId}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
          >
            {testing ? 'Testing...' : 'Test Connection'}
          </button>

          <button
            onClick={handleSave}
            disabled={saving || !accessToken || !phoneNumberId || !businessAccountId}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
          >
            {saving ? 'Saving...' : isConnected ? 'Update Settings' : 'Connect WhatsApp'}
          </button>

          {isConnected && (
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 disabled:opacity-50 text-sm font-medium transition-colors"
            >
              {disconnecting ? 'Disconnecting...' : 'Disconnect'}
            </button>
          )}
        </div>
      </div>

      {/* How it works section */}
      <div className="mt-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          What you can do with WhatsApp connected
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="font-medium text-gray-900 dark:text-white text-sm">
              Send messages
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
              Send WhatsApp messages to contacts directly from account pages
            </p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="font-medium text-gray-900 dark:text-white text-sm">
              Automated sequences
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
              Include WhatsApp steps in your automated follow-up sequences
            </p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="font-medium text-gray-900 dark:text-white text-sm">
              Receive replies
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
              Incoming WhatsApp messages appear in the account timeline
            </p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="font-medium text-gray-900 dark:text-white text-sm">
              Delivery tracking
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
              See when messages are delivered and read
            </p>
          </div>
        </div>
      </div>

      {/* Important notes */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-2">
          Important notes
        </h3>
        <ul className="text-gray-500 dark:text-gray-400 text-xs space-y-1">
          <li>
            You need a verified Meta Business account to send messages to people who haven&apos;t messaged you first.
          </li>
          <li>
            To start a new conversation, you must use an approved message template. Freeform messages are only allowed within 24 hours of the contact&apos;s last message to you.
          </li>
          <li>
            Your access token should be from a System User (not a temporary token from the API Setup page).
          </li>
          <li>
            WhatsApp features are available on Growth plan and above.
          </li>
        </ul>
      </div>
    </div>
  );
}
