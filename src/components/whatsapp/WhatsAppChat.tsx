// src/components/whatsapp/WhatsAppChat.tsx
// Embedded WhatsApp chat component for account detail pages
// Shows message history and allows sending messages to contacts

'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client'

interface WhatsAppChatProps {
  accountId: string;
  orgId: string;
  contactId?: string;
  contactName?: string;
  contactPhone?: string;
}

interface Message {
  id: string;
  direction: 'inbound' | 'outbound';
  content: string;
  message_type: string;
  template_name: string | null;
  status: string;
  from_number: string;
  to_number: string;
  created_at: string;
  delivered_at: string | null;
  read_at: string | null;
}

export default function WhatsAppChat({
  accountId,
  orgId,
  contactId,
  contactName,
  contactPhone,
}: WhatsAppChatProps) {
  const supabase = createClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    checkConnection();
    loadMessages();
  }, [accountId, contactId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function checkConnection() {
    const { data } = await supabase
      .from('whatsapp_config')
      .select('id, is_verified')
      .eq('org_id', orgId)
      .eq('is_active', true)
      .single();

    setIsConnected(!!data?.is_verified);
  }

  async function loadMessages() {
    setLoading(true);
    try {
      let query = supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: true });

      if (contactId) {
        query = query.eq('contact_id', contactId);
      } else {
        query = query.eq('account_id', accountId);
      }

      const { data, error: fetchError } = await query.limit(100);

      if (fetchError) throw fetchError;
      setMessages(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  async function handleSend() {
    if (!newMessage.trim() || !contactPhone) return;

    setSending(true);
    setError(null);

    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: contactPhone,
          type: 'text',
          message: newMessage.trim(),
          contact_id: contactId,
          account_id: accountId,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error);
        return;
      }

      setNewMessage('');
      // Reload messages to show the sent one
      await loadMessages();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString('en-NG', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-NG', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  function statusIcon(status: string) {
    switch (status) {
      case 'sent':
        return <span className="text-gray-400" title="Sent">&#10003;</span>;
      case 'delivered':
        return <span className="text-gray-400" title="Delivered">&#10003;&#10003;</span>;
      case 'read':
        return <span className="text-blue-500" title="Read">&#10003;&#10003;</span>;
      case 'failed':
        return <span className="text-red-500" title="Failed">&#10007;</span>;
      default:
        return <span className="text-gray-300" title="Pending">&#8987;</span>;
    }
  }

  // Not connected state
  if (!isConnected) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 text-center">
        <div className="text-3xl mb-3">&#128172;</div>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
          WhatsApp is not connected yet.
        </p>
        <a
          href="/settings/whatsapp"
          className="text-purple-600 dark:text-purple-400 text-sm font-medium hover:underline"
        >
          Go to WhatsApp Settings to connect
        </a>
      </div>
    );
  }

  // No contact phone
  if (!contactPhone) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 text-center">
        <div className="text-3xl mb-3">&#128241;</div>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          No WhatsApp number on file for this contact. Add one in the contact details to start chatting.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[500px] bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <span className="text-green-600 text-sm">W</span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {contactName || 'Contact'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {contactPhone}
            </p>
          </div>
        </div>
        <button
          onClick={loadMessages}
          className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          title="Refresh messages"
        >
          &#8635; Refresh
        </button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <p className="text-gray-400 text-sm">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <p className="text-gray-400 text-sm text-center">
              No messages yet. Send a message to start the conversation.
              <br />
              <span className="text-xs">
                Note: You may need to use a message template for the first message.
              </span>
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg, index) => {
              // Show date separator
              const showDate =
                index === 0 ||
                formatDate(msg.created_at) !== formatDate(messages[index - 1].created_at);

              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="flex justify-center my-2">
                      <span className="text-xs text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-700 px-3 py-1 rounded-full">
                        {formatDate(msg.created_at)}
                      </span>
                    </div>
                  )}
                  <div
                    className={`flex ${
                      msg.direction === 'outbound' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[75%] rounded-lg px-3 py-2 ${
                        msg.direction === 'outbound'
                          ? 'bg-purple-600 text-white'
                          : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600'
                      }`}
                    >
                      {msg.template_name && (
                        <p className={`text-xs mb-1 ${
                          msg.direction === 'outbound' ? 'text-purple-200' : 'text-gray-400'
                        }`}>
                          Template: {msg.template_name}
                        </p>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <div
                        className={`flex items-center gap-1 mt-1 ${
                          msg.direction === 'outbound' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <span
                          className={`text-xs ${
                            msg.direction === 'outbound'
                              ? 'text-purple-200'
                              : 'text-gray-400 dark:text-gray-500'
                          }`}
                        >
                          {formatTime(msg.created_at)}
                        </span>
                        {msg.direction === 'outbound' && (
                          <span className="text-xs">{statusIcon(msg.status)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Compose */}
      <div className="px-4 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm resize-none"
          />
          <button
            onClick={handleSend}
            disabled={sending || !newMessage.trim()}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
          >
            {sending ? '...' : 'Send'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Press Enter to send. Shift+Enter for new line.
        </p>
      </div>
    </div>
  );
}
