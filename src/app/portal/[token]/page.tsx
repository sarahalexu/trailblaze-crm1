// src/app/portal/[token]/page.tsx
// Client-facing portal - clients access with a unique token
// Shows account health, recent interactions, and feedback form
// This is a PUBLIC page (no auth required, token-based access)

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface PortalData {
  account: {
    name: string;
    health_status: string;
    health_score_total: number;
    health_score_know: number;
    health_score_engage: number;
    health_score_exceed: number;
    health_score_prevent: number;
    renewal_date: string | null;
    industry: string | null;
  };
  contact: {
    full_name: string;
    email: string;
  };
  org: {
    name: string;
  };
  permissions: {
    view_health: boolean;
    view_interactions: boolean;
    view_playbooks: boolean;
    submit_feedback: boolean;
  };
  interactions: {
    id: string;
    channel: string;
    subject: string;
    content: string;
    created_at: string;
  }[];
  playbooks: {
    id: string;
    name: string;
    status: string;
    progress: number;
  }[];
}

export default function ClientPortalPage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  // Feedback form
  const [rating, setRating] = useState(0);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [feedbackCategory, setFeedbackCategory] = useState('general');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

  useEffect(() => {
    loadPortal();
  }, [token]);

  async function loadPortal() {
    try {
      const res = await fetch(`/api/portal/${token}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Access denied');
      }
      const portalData = await res.json();
      setData(portalData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitFeedback() {
    if (rating === 0) return;
    setSubmittingFeedback(true);

    try {
      const res = await fetch(`/api/portal/${token}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          message: feedbackMsg.trim(),
          category: feedbackCategory,
        }),
      });

      if (res.ok) {
        setFeedbackSent(true);
        setRating(0);
        setFeedbackMsg('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingFeedback(false);
    }
  }

  function getHealthColor(status: string) {
    if (status === 'healthy') return { bg: 'bg-green-500', text: 'text-green-700', light: 'bg-green-50 dark:bg-green-900/20' };
    if (status === 'at_risk') return { bg: 'bg-yellow-500', text: 'text-yellow-700', light: 'bg-yellow-50 dark:bg-yellow-900/20' };
    return { bg: 'bg-red-500', text: 'text-red-700', light: 'bg-red-50 dark:bg-red-900/20' };
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <p className="text-4xl mb-4">&#128274;</p>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const healthColors = getHealthColor(data.account.health_status);

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Client Portal</p>
            <h1 className="text-lg font-bold text-gray-900">{data.account.name}</h1>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">{data.contact.full_name}</p>
            <p className="text-xs text-gray-400">Managed by {data.org.name}</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
          {['overview', ...(data.permissions.view_interactions ? ['activity'] : []), ...(data.permissions.submit_feedback ? ['feedback'] : [])].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
                activeTab === tab
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Health Score */}
            {data.permissions.view_health && (
              <div className={`rounded-lg p-6 ${healthColors.light}`}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Account Health</h2>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium text-white ${healthColors.bg}`}>
                    {data.account.health_status.replace('_', ' ')}
                  </span>
                </div>

                <div className="flex items-center gap-4 mb-4">
                  <div className="text-4xl font-bold text-gray-900">
                    {data.account.health_score_total}
                    <span className="text-lg text-gray-400 font-normal">/20</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Know', score: data.account.health_score_know, max: 5 },
                    { label: 'Engage', score: data.account.health_score_engage, max: 5 },
                    { label: 'Exceed', score: data.account.health_score_exceed, max: 5 },
                    { label: 'Prevent', score: data.account.health_score_prevent, max: 5 },
                  ].map((item) => (
                    <div key={item.label} className="bg-white rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                      <p className="text-lg font-bold text-gray-900">
                        {item.score}<span className="text-xs text-gray-400 font-normal">/{item.max}</span>
                      </p>
                      <div className="h-1.5 bg-gray-200 rounded-full mt-1 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(item.score / item.max) * 100}%`,
                            backgroundColor: item.score >= 4 ? '#10B981' : item.score >= 3 ? '#F59E0B' : '#EF4444',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Renewal date */}
            {data.account.renewal_date && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-500">Next Renewal</p>
                <p className="text-lg font-semibold text-gray-900">
                  {new Date(data.account.renewal_date).toLocaleDateString('en-NG', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </p>
              </div>
            )}

            {/* Active playbooks */}
            {data.permissions.view_playbooks && data.playbooks.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Plans</h2>
                <div className="space-y-3">
                  {data.playbooks.map((pb) => (
                    <div key={pb.id} className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{pb.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-500 rounded-full"
                              style={{ width: `${pb.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-400">{pb.progress}%</span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        pb.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {pb.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && data.permissions.view_interactions && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
            {data.interactions.length > 0 ? (
              <div className="space-y-4">
                {data.interactions.map((i) => (
                  <div key={i.id} className="flex gap-3 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-500 flex-shrink-0">
                      {i.channel === 'email' ? '&#9993;' : i.channel === 'call' ? '&#128222;' : i.channel === 'whatsapp' ? 'W' : '&#128172;'}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{i.subject}</p>
                      {i.content && (
                        <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{i.content}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(i.created_at).toLocaleDateString('en-NG', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm text-center py-6">No recent activity.</p>
            )}
          </div>
        )}

        {/* Feedback Tab */}
        {activeTab === 'feedback' && data.permissions.submit_feedback && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Share Your Feedback</h2>

            {feedbackSent ? (
              <div className="text-center py-8">
                <p className="text-3xl mb-2">&#127881;</p>
                <p className="text-gray-900 font-medium">Thank you for your feedback!</p>
                <p className="text-gray-500 text-sm mt-1">We appreciate you taking the time to share your thoughts.</p>
                <button
                  onClick={() => setFeedbackSent(false)}
                  className="mt-4 text-purple-600 text-sm hover:underline"
                >
                  Send another
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    How would you rate your experience?
                  </p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        className={`text-3xl transition-transform hover:scale-110 ${
                          star <= rating ? 'text-yellow-400' : 'text-gray-300'
                        }`}
                      >
                        &#9733;
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={feedbackCategory}
                    onChange={(e) => setFeedbackCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="general">General Feedback</option>
                    <option value="praise">Praise</option>
                    <option value="support">Support Request</option>
                    <option value="feature_request">Feature Request</option>
                    <option value="complaint">Complaint</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message (optional)</label>
                  <textarea
                    value={feedbackMsg}
                    onChange={(e) => setFeedbackMsg(e.target.value)}
                    placeholder="Tell us more..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-400"
                  />
                </div>

                <button
                  onClick={submitFeedback}
                  disabled={submittingFeedback || rating === 0}
                  className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium text-sm"
                >
                  {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-12 py-4 px-6 text-center">
        <p className="text-xs text-gray-400">
          Powered by TrailBlaze CRM
        </p>
      </footer>
    </div>
  );
}
