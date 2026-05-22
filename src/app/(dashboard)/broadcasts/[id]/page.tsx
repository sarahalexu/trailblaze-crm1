// src/app/(dashboard)/broadcasts/[id]/page.tsx
// Broadcast detail - view send results and recipient status

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function BroadcastDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClientComponentClient();
  const broadcastId = params.id as string;

  const [broadcast, setBroadcast] = useState<any>(null);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBroadcast();
  }, [broadcastId]);

  async function loadBroadcast() {
    const { data: b } = await supabase
      .from('broadcasts')
      .select('*')
      .eq('id', broadcastId)
      .single();

    const { data: r } = await supabase
      .from('broadcast_recipients')
      .select('*, contacts(full_name)')
      .eq('broadcast_id', broadcastId)
      .order('status');

    setBroadcast(b);
    setRecipients(r || []);
    setLoading(false);
  }

  function getStatusColor(status: string) {
    const colors: Record<string, string> = {
      sent: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30',
      delivered: 'text-green-600 bg-green-50 dark:bg-green-900/30',
      read: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30',
      failed: 'text-red-600 bg-red-50 dark:bg-red-900/30',
      pending: 'text-gray-500 bg-gray-50 dark:bg-gray-700',
    };
    return colors[status] || colors.pending;
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64" />
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  if (!broadcast) {
    return (
      <div className="p-6 text-center text-gray-400">Broadcast not found.</div>
    );
  }

  const sentPercent = broadcast.total_recipients > 0 ? Math.round((broadcast.sent_count / broadcast.total_recipients) * 100) : 0;
  const deliveredPercent = broadcast.total_recipients > 0 ? Math.round((broadcast.delivered_count / broadcast.total_recipients) * 100) : 0;

  return (
    <div className="p-6 max-w-4xl">
      <button
        onClick={() => router.push('/broadcasts')}
        className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-1"
      >
        &larr; Back to Broadcasts
      </button>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        {broadcast.name}
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{broadcast.total_recipients}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Sent</p>
          <p className="text-2xl font-bold text-blue-600">{broadcast.sent_count}</p>
          <p className="text-xs text-gray-400">{sentPercent}%</p>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Delivered</p>
          <p className="text-2xl font-bold text-green-600">{broadcast.delivered_count}</p>
          <p className="text-xs text-gray-400">{deliveredPercent}%</p>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Failed</p>
          <p className="text-2xl font-bold text-red-600">{broadcast.failed_count}</p>
        </div>
      </div>

      {/* Recipients table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Contact</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Phone</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Error</th>
            </tr>
          </thead>
          <tbody>
            {recipients.map((r) => (
              <tr key={r.id} className="border-b border-gray-100 dark:border-gray-700">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                  {r.contacts?.full_name || 'Unknown'}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-xs">
                  {r.phone_number}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(r.status)}`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-red-400 text-xs truncate max-w-48">
                  {r.error_message || ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
