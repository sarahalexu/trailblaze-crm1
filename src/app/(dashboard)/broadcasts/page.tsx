// src/app/(dashboard)/broadcasts/page.tsx
// WhatsApp Broadcast list - view all broadcasts, create new ones

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function BroadcastsPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBroadcasts();
  }, []);

  async function loadBroadcasts() {
    const { data } = await supabase
      .from('broadcasts')
      .select('*')
      .order('created_at', { ascending: false });

    setBroadcasts(data || []);
    setLoading(false);
  }

  function getStatusBadge(status: string) {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
      scheduled: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      sending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
      completed: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
      failed: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
      cancelled: 'bg-gray-100 dark:bg-gray-700 text-gray-500',
    };
    return styles[status] || styles.draft;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Broadcasts
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
            Send WhatsApp messages to multiple contacts at once.
          </p>
        </div>
        <button
          onClick={() => router.push('/broadcasts/new')}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
        >
          + New Broadcast
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : broadcasts.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-3xl mb-3">&#128227;</p>
          <p className="text-gray-600 dark:text-gray-400 mb-1">No broadcasts yet</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mb-4">
            Send a WhatsApp message to multiple contacts in one go.
          </p>
          <button
            onClick={() => router.push('/broadcasts/new')}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
          >
            Create Your First Broadcast
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Recipients</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Sent</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Delivered</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Created</th>
              </tr>
            </thead>
            <tbody>
              {broadcasts.map((b) => (
                <tr
                  key={b.id}
                  className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                  onClick={() => router.push(`/broadcasts/${b.id}`)}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-white">{b.name}</p>
                    {b.template_name && (
                      <p className="text-xs text-gray-400">Template: {b.template_name}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(b.status)}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{b.total_recipients}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{b.sent_count}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{b.delivered_count}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(b.created_at).toLocaleDateString('en-NG', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
