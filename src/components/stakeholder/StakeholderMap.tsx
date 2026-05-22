// src/components/stakeholder/StakeholderMap.tsx
// Visual stakeholder/relationship map for account detail pages
// Shows contacts as nodes with relationship lines between them

'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface StakeholderMapProps {
  accountId: string;
  orgId: string;
}

interface Contact {
  id: string;
  full_name: string;
  job_title: string | null;
  role_type: string | null;
  email: string | null;
}

interface Relationship {
  id: string;
  from_contact_id: string;
  to_contact_id: string;
  relationship_type: string;
  strength: string;
  notes: string | null;
}

const ROLE_COLORS: Record<string, string> = {
  decision_maker: '#EF4444',
  champion: '#8B5CF6',
  influencer: '#F59E0B',
  end_user: '#3B82F6',
  budget_holder: '#10B981',
  technical_evaluator: '#06B6D4',
};

const RELATIONSHIP_LABELS: Record<string, string> = {
  reports_to: 'Reports to',
  manages: 'Manages',
  works_with: 'Works with',
  influences: 'Influences',
  blocks: 'Blocks',
  champions: 'Champions',
  budget_holder: 'Budget holder',
  decision_maker: 'Decision maker',
  end_user: 'End user',
  technical_evaluator: 'Technical evaluator',
};

const RELATIONSHIP_TYPES = [
  'reports_to', 'manages', 'works_with', 'influences',
  'blocks', 'champions', 'budget_holder', 'decision_maker',
  'end_user', 'technical_evaluator',
];

const STRENGTH_OPTIONS = ['strong', 'medium', 'weak'];

export default function StakeholderMap({ accountId, orgId }: StakeholderMapProps) {
  const supabase = createClientComponentClient();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState(true);

  // Add relationship modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [relType, setRelType] = useState('works_with');
  const [relStrength, setRelStrength] = useState('medium');
  const [relNotes, setRelNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [accountId]);

  async function loadData() {
    setLoading(true);

    const { data: contactData } = await supabase
      .from('contacts')
      .select('id, full_name, job_title, role_type, email')
      .eq('account_id', accountId)
      .order('full_name');

    const { data: relData } = await supabase
      .from('stakeholder_relationships')
      .select('*')
      .eq('account_id', accountId);

    setContacts(contactData || []);
    setRelationships(relData || []);
    setLoading(false);
  }

  async function addRelationship() {
    if (!fromId || !toId || fromId === toId) return;
    setSaving(true);

    const { error } = await supabase.from('stakeholder_relationships').insert({
      org_id: orgId,
      account_id: accountId,
      from_contact_id: fromId,
      to_contact_id: toId,
      relationship_type: relType,
      strength: relStrength,
      notes: relNotes.trim() || null,
    });

    if (!error) {
      await loadData();
      setShowAddModal(false);
      setFromId('');
      setToId('');
      setRelType('works_with');
      setRelStrength('medium');
      setRelNotes('');
    }
    setSaving(false);
  }

  async function removeRelationship(id: string) {
    if (!confirm('Remove this relationship?')) return;
    await supabase.from('stakeholder_relationships').delete().eq('id', id);
    await loadData();
  }

  function getRoleColor(roleType: string | null) {
    return ROLE_COLORS[roleType || ''] || '#6B7280';
  }

  function getStrengthStyle(strength: string) {
    if (strength === 'strong') return 'border-2';
    if (strength === 'weak') return 'border border-dashed';
    return 'border';
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48" />
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <p className="text-3xl mb-2">&#128101;</p>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Add contacts to this account to build a stakeholder map.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          Stakeholder Map
        </h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-xs font-medium"
        >
          + Add Relationship
        </button>
      </div>

      {/* Visual map - card layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {contacts.map((contact) => {
          const outgoing = relationships.filter((r) => r.from_contact_id === contact.id);
          const incoming = relationships.filter((r) => r.to_contact_id === contact.id);
          const allRels = [...outgoing, ...incoming];
          const color = getRoleColor(contact.role_type);

          return (
            <div
              key={contact.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 relative"
            >
              {/* Role indicator */}
              <div
                className="absolute top-0 left-0 w-full h-1 rounded-t-lg"
                style={{ backgroundColor: color }}
              />

              <div className="pt-1">
                <p className="font-medium text-sm text-gray-900 dark:text-white">
                  {contact.full_name}
                </p>
                {contact.job_title && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">{contact.job_title}</p>
                )}
                {contact.role_type && (
                  <span
                    className="inline-block mt-1 px-2 py-0.5 rounded text-xs text-white font-medium"
                    style={{ backgroundColor: color }}
                  >
                    {contact.role_type.replace('_', ' ')}
                  </span>
                )}

                {/* Relationships for this contact */}
                {allRels.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {allRels.map((rel) => {
                      const isOutgoing = rel.from_contact_id === contact.id;
                      const otherId = isOutgoing ? rel.to_contact_id : rel.from_contact_id;
                      const other = contacts.find((c) => c.id === otherId);
                      if (!other) return null;

                      return (
                        <div
                          key={rel.id}
                          className={`flex items-center gap-2 text-xs p-1.5 rounded bg-gray-50 dark:bg-gray-700/50 group ${getStrengthStyle(rel.strength)} border-gray-300 dark:border-gray-600`}
                        >
                          <span className="text-gray-400">
                            {isOutgoing ? '&rarr;' : '&larr;'}
                          </span>
                          <span className="text-gray-600 dark:text-gray-300 flex-1">
                            {RELATIONSHIP_LABELS[rel.relationship_type] || rel.relationship_type}{' '}
                            <span className="font-medium text-gray-900 dark:text-white">
                              {other.full_name}
                            </span>
                          </span>
                          <button
                            onClick={() => removeRelationship(rel.id)}
                            className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove"
                          >
                            &#10005;
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {allRels.length === 0 && (
                  <p className="mt-2 text-xs text-gray-400 italic">No relationships mapped</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4">
        {Object.entries(ROLE_COLORS).map(([role, color]) => (
          <div key={role} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            {role.replace('_', ' ')}
          </div>
        ))}
      </div>

      {/* Add Relationship Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Add Relationship
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">From</label>
                <select
                  value={fromId}
                  onChange={(e) => setFromId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="">Select contact...</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>{c.full_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Relationship</label>
                <select
                  value={relType}
                  onChange={(e) => setRelType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  {RELATIONSHIP_TYPES.map((t) => (
                    <option key={t} value={t}>{RELATIONSHIP_LABELS[t]}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">To</label>
                <select
                  value={toId}
                  onChange={(e) => setToId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="">Select contact...</option>
                  {contacts.filter((c) => c.id !== fromId).map((c) => (
                    <option key={c.id} value={c.id}>{c.full_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Strength</label>
                <div className="flex gap-2">
                  {STRENGTH_OPTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setRelStrength(s)}
                      className={`flex-1 py-1.5 rounded text-xs font-medium border transition-colors ${
                        relStrength === s
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                          : 'border-gray-200 dark:border-gray-700 text-gray-500'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={relNotes}
                  onChange={(e) => setRelNotes(e.target.value)}
                  placeholder="Any context about this relationship"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-5">
              <button
                onClick={addRelationship}
                disabled={saving || !fromId || !toId}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium"
              >
                {saving ? 'Adding...' : 'Add Relationship'}
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
