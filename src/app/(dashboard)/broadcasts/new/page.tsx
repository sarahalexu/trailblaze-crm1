// src/app/(dashboard)/broadcasts/new/page.tsx
// Create a new WhatsApp broadcast - select recipients and compose message

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface Contact {
  id: string;
  full_name: string;
  whatsapp_number: string | null;
  phone_number: string | null;
  email: string | null;
  account_id: string;
  account_name?: string;
}

export default function NewBroadcastPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const [name, setName] = useState('');
  const [messageType, setMessageType] = useState<'template' | 'text'>('template');
  const [templateName, setTemplateName] = useState('');
  const [templateLang, setTemplateLang] = useState('en');
  const [messageContent, setMessageContent] = useState('');
  const [templates, setTemplates] = useState<any[]>([]);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState<'all' | 'has_whatsapp'>('has_whatsapp');

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    loadContacts();
    loadTemplates();
  }, []);

  async function loadContacts() {
    const { data } = await supabase
      .from('contacts')
      .select('id, full_name, whatsapp_number, phone_number, email, account_id, accounts(name)')
      .order('full_name');

    const mapped = (data || []).map((c: any) => ({
      ...c,
      account_name: c.accounts?.name || '',
    }));
    setContacts(mapped);
    setLoading(false);
  }

  async function loadTemplates() {
    try {
      const res = await fetch('/api/whatsapp/templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch (err) {
      // Templates may not be available yet
    }
  }

  function getFilteredContacts() {
    let filtered = contacts;
    if (filterBy === 'has_whatsapp') {
      filtered = filtered.filter((c) => c.whatsapp_number || c.phone_number);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.full_name.toLowerCase().includes(q) ||
          c.account_name?.toLowerCase().includes(q) ||
          c.whatsapp_number?.includes(q) ||
          c.phone_number?.includes(q)
      );
    }
    return filtered;
  }

  function toggleContact(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  function selectAll() {
    const filtered = getFilteredContacts();
    const allSelected = filtered.every((c) => selectedIds.has(c.id));
    if (allSelected) {
      const next = new Set(selectedIds);
      filtered.forEach((c) => next.delete(c.id));
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      filtered.forEach((c) => next.add(c.id));
      setSelectedIds(next);
    }
  }

  async function handleSend() {
    if (!name.trim()) {
      setError('Give your broadcast a name.');
      return;
    }
    if (selectedIds.size === 0) {
      setError('Select at least one recipient.');
      return;
    }
    if (messageType === 'template' && !templateName) {
      setError('Select a message template.');
      return;
    }
    if (messageType === 'text' && !messageContent.trim()) {
      setError('Write your message.');
      return;
    }

    setSending(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      const { data: userData } = await supabase
        .from('users')
        .select('org_id')
        .eq('auth_id', user.id)
        .single();
      if (!userData) throw new Error('User not found');

      // Create broadcast record
      const { data: broadcast, error: bErr } = await supabase
        .from('broadcasts')
        .insert({
          org_id: userData.org_id,
          name: name.trim(),
          channel: 'whatsapp',
          message_type: messageType,
          template_name: messageType === 'template' ? templateName : null,
          template_language: messageType === 'template' ? templateLang : null,
          message_content: messageType === 'text' ? messageContent.trim() : null,
          status: 'sending',
          total_recipients: selectedIds.size,
          created_by_user_id: user.id,
        })
        .select()
        .single();

      if (bErr) throw bErr;

      // Create recipient records
      const selectedContacts = contacts.filter((c) => selectedIds.has(c.id));
      const recipientInserts = selectedContacts.map((c) => ({
        broadcast_id: broadcast.id,
        contact_id: c.id,
        phone_number: c.whatsapp_number || c.phone_number || '',
        status: 'pending',
      }));

      const { error: rErr } = await supabase
        .from('broadcast_recipients')
        .insert(recipientInserts);

      if (rErr) throw rErr;

      // Send messages one by one via the API
      let sentCount = 0;
      let failedCount = 0;

      for (const recipient of recipientInserts) {
        try {
          const sendBody: any = {
            to: recipient.phone_number,
            contact_id: recipient.contact_id,
          };

          if (messageType === 'template') {
            sendBody.type = 'template';
            sendBody.template_name = templateName;
            sendBody.template_lang = templateLang;
          } else {
            sendBody.type = 'text';
            sendBody.message = messageContent.trim();
          }

          const res = await fetch('/api/whatsapp/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sendBody),
          });

          if (res.ok) {
            sentCount++;
            await supabase
              .from('broadcast_recipients')
              .update({ status: 'sent', sent_at: new Date().toISOString() })
              .eq('broadcast_id', broadcast.id)
              .eq('contact_id', recipient.contact_id);
          } else {
            const errData = await res.json();
            failedCount++;
            await supabase
              .from('broadcast_recipients')
              .update({ status: 'failed', error_message: errData.error })
              .eq('broadcast_id', broadcast.id)
              .eq('contact_id', recipient.contact_id);
          }
        } catch {
          failedCount++;
        }
      }

      // Update broadcast with final counts
      await supabase
        .from('broadcasts')
        .update({
          status: 'completed',
          sent_count: sentCount,
          failed_count: failedCount,
          completed_at: new Date().toISOString(),
        })
        .eq('id', broadcast.id);

      router.push(`/broadcasts/${broadcast.id}`);
    } catch (err: any) {
      setError(err.message);
      setSending(false);
    }
  }

  const filteredContacts = getFilteredContacts();
  const allSelected = filteredContacts.length > 0 && filteredContacts.every((c) => selectedIds.has(c.id));

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-1"
        >
          &larr; Back to Broadcasts
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          New Broadcast
        </h1>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg text-sm border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <button
              onClick={() => setStep(s as 1 | 2 | 3)}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === s
                  ? 'bg-purple-600 text-white'
                  : step > s
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}
            >
              {step > s ? '&#10003;' : s}
            </button>
            <span className={`text-sm ${step === s ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-400'}`}>
              {s === 1 ? 'Details' : s === 2 ? 'Recipients' : 'Review'}
            </span>
            {s < 3 && <div className="w-8 h-px bg-gray-300 dark:bg-gray-600" />}
          </div>
        ))}
      </div>

      {/* Step 1: Details */}
      {step === 1 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Broadcast Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. May Newsletter, Product Update"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Message Type
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setMessageType('template')}
                className={`flex-1 p-4 border rounded-lg text-left ${
                  messageType === 'template'
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <p className="font-medium text-sm text-gray-900 dark:text-white">Template Message</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Use an approved Meta template. Required for contacts who haven&apos;t messaged you.
                </p>
              </button>
              <button
                onClick={() => setMessageType('text')}
                className={`flex-1 p-4 border rounded-lg text-left ${
                  messageType === 'text'
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <p className="font-medium text-sm text-gray-900 dark:text-white">Custom Text</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Write your own message. Only works if contact messaged you in the last 24 hours.
                </p>
              </button>
            </div>
          </div>

          {messageType === 'template' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Select Template
              </label>
              {templates.length > 0 ? (
                <select
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="">Choose a template...</option>
                  {templates.map((t: any) => (
                    <option key={t.name} value={t.name}>
                      {t.name} ({t.language})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 rounded-lg text-sm border border-yellow-200 dark:border-yellow-800">
                  No templates found. Make sure WhatsApp is connected in Settings and you have approved templates in your Meta Business account.
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Message
              </label>
              <textarea
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="Type your message here..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">{messageContent.length} characters</p>
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-sm"
            >
              Next: Select Recipients
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Recipients */}
      {step === 2 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              <span className="font-semibold text-purple-600 dark:text-purple-400">
                {selectedIds.size}
              </span>{' '}
              contacts selected
            </p>
            <div className="flex items-center gap-2">
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value as any)}
                className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                <option value="has_whatsapp">With phone number</option>
                <option value="all">All contacts</option>
              </select>
            </div>
          </div>

          <div className="mb-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contacts by name, account, or number..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 text-sm"
            />
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
            {/* Select all header */}
            <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 sticky top-0">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={selectAll}
                className="rounded border-gray-300"
              />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Select all ({filteredContacts.length})
              </span>
            </div>

            {filteredContacts.map((contact) => (
              <label
                key={contact.id}
                className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(contact.id)}
                  onChange={() => toggleContact(contact.id)}
                  className="rounded border-gray-300"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {contact.full_name}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {contact.account_name}
                    {contact.whatsapp_number || contact.phone_number
                      ? ` · ${contact.whatsapp_number || contact.phone_number}`
                      : ' · No phone number'}
                  </p>
                </div>
                {!contact.whatsapp_number && !contact.phone_number && (
                  <span className="text-xs text-red-400">No number</span>
                )}
              </label>
            ))}

            {filteredContacts.length === 0 && (
              <div className="px-4 py-8 text-center text-gray-400 text-sm">
                No contacts found.
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 text-sm"
            >
              &larr; Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-sm"
            >
              Next: Review
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review and Send */}
      {step === 3 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Review Broadcast</h2>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-gray-500 dark:text-gray-400 text-xs mb-0.5">Name</p>
              <p className="font-medium text-gray-900 dark:text-white">{name || 'Untitled'}</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-gray-500 dark:text-gray-400 text-xs mb-0.5">Recipients</p>
              <p className="font-medium text-gray-900 dark:text-white">{selectedIds.size} contacts</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-gray-500 dark:text-gray-400 text-xs mb-0.5">Type</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {messageType === 'template' ? `Template: ${templateName}` : 'Custom Text'}
              </p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-gray-500 dark:text-gray-400 text-xs mb-0.5">Channel</p>
              <p className="font-medium text-gray-900 dark:text-white">WhatsApp</p>
            </div>
          </div>

          {messageType === 'text' && messageContent && (
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Message Preview</p>
              <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{messageContent}</p>
            </div>
          )}

          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              This will send {selectedIds.size} WhatsApp messages immediately. This action cannot be undone.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 text-sm"
            >
              &larr; Back
            </button>
            <button
              onClick={handleSend}
              disabled={sending}
              className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium text-sm"
            >
              {sending ? `Sending to ${selectedIds.size} contacts...` : `Send Broadcast (${selectedIds.size})`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
