// src/app/(dashboard)/pipeline/create/page.tsx
// Custom Pipeline Builder - Scale plan users create new pipeline types

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client'

interface PipelineStage {
  id: string;
  name: string;
  color: string;
  sort_order: number;
}

const STAGE_COLORS = [
  '#6B7280', '#3B82F6', '#8B5CF6', '#EC4899',
  '#F59E0B', '#10B981', '#EF4444', '#06B6D4',
  '#F97316', '#84CC16', '#2b0548', '#00adef',
];

const PIPELINE_TEMPLATES = [
  {
    name: 'Investor Relations',
    type: 'investor_relations',
    description: 'Track investor outreach from first contact to close',
    stages: [
      { name: 'Research', color: '#6B7280' },
      { name: 'Outreach', color: '#3B82F6' },
      { name: 'First Meeting', color: '#8B5CF6' },
      { name: 'Due Diligence', color: '#F59E0B' },
      { name: 'Term Sheet', color: '#EC4899' },
      { name: 'Closed', color: '#10B981' },
    ],
  },
  {
    name: 'Donor Management',
    type: 'donor_management',
    description: 'Manage donor relationships from prospect to recurring',
    stages: [
      { name: 'Prospect', color: '#6B7280' },
      { name: 'Cultivation', color: '#3B82F6' },
      { name: 'Solicitation', color: '#8B5CF6' },
      { name: 'Pledged', color: '#F59E0B' },
      { name: 'Received', color: '#10B981' },
      { name: 'Stewardship', color: '#06B6D4' },
    ],
  },
  {
    name: 'Partner Onboarding',
    type: 'partner_onboarding',
    description: 'Track partner activation from signup to live',
    stages: [
      { name: 'Applied', color: '#6B7280' },
      { name: 'Screening', color: '#3B82F6' },
      { name: 'Approved', color: '#8B5CF6' },
      { name: 'Training', color: '#F59E0B' },
      { name: 'Pilot', color: '#EC4899' },
      { name: 'Live', color: '#10B981' },
    ],
  },
  {
    name: 'Blank Pipeline',
    type: 'custom',
    description: 'Start from scratch with your own stages',
    stages: [
      { name: 'Stage 1', color: '#6B7280' },
      { name: 'Stage 2', color: '#3B82F6' },
      { name: 'Stage 3', color: '#10B981' },
    ],
  },
];

export default function CreatePipelinePage() {
  const router = useRouter();
  const supabase = createClient()

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pipelineType, setPipelineType] = useState('custom');
  const [stages, setStages] = useState<PipelineStage[]>([
    { id: crypto.randomUUID(), name: 'Stage 1', color: '#6B7280', sort_order: 0 },
    { id: crypto.randomUUID(), name: 'Stage 2', color: '#3B82F6', sort_order: 1 },
    { id: crypto.randomUUID(), name: 'Stage 3', color: '#10B981', sort_order: 2 },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function applyTemplate(template: typeof PIPELINE_TEMPLATES[0]) {
    setName(template.name);
    setDescription(template.description);
    setPipelineType(template.type);
    setStages(
      template.stages.map((s, i) => ({
        id: crypto.randomUUID(),
        name: s.name,
        color: s.color,
        sort_order: i,
      }))
    );
  }

  function addStage() {
    setStages([
      ...stages,
      {
        id: crypto.randomUUID(),
        name: '',
        color: STAGE_COLORS[stages.length % STAGE_COLORS.length],
        sort_order: stages.length,
      },
    ]);
  }

  function removeStage(id: string) {
    if (stages.length <= 2) return;
    setStages(
      stages.filter((s) => s.id !== id).map((s, i) => ({ ...s, sort_order: i }))
    );
  }

  function updateStage(id: string, field: 'name' | 'color', value: string) {
    setStages(stages.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  }

  function moveStage(index: number, direction: 'up' | 'down') {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === stages.length - 1) return;
    const newStages = [...stages];
    const swap = direction === 'up' ? index - 1 : index + 1;
    [newStages[index], newStages[swap]] = [newStages[swap], newStages[index]];
    setStages(newStages.map((s, i) => ({ ...s, sort_order: i })));
  }

  async function handleSave() {
    if (!name.trim()) {
      setError('Pipeline name is required.');
      return;
    }
    const filledStages = stages.filter((s) => s.name.trim());
    if (filledStages.length < 2) {
      setError('A pipeline needs at least 2 stages.');
      return;
    }

    setSaving(true);
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

      // Create pipeline
      const { data: pipeline, error: pErr } = await supabase
        .from('pipelines')
        .insert({
          org_id: userData.org_id,
          name: name.trim(),
          pipeline_type: pipelineType,
          is_default: false,
          is_custom: true,
          icon: 'pipeline',
          description: description.trim() || null,
        })
        .select()
        .single();

      if (pErr) throw pErr;

      // Create stages
      const stageInserts = filledStages.map((s, i) => ({
        pipeline_id: pipeline.id,
        name: s.name.trim(),
        color: s.color,
        sort_order: i,
      }));

      const { error: sErr } = await supabase
        .from('pipeline_stages')
        .insert(stageInserts);

      if (sErr) throw sErr;

      router.push(`/pipeline/custom/${pipeline.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-1"
        >
          &larr; Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Create Custom Pipeline
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
          Build a pipeline for any workflow beyond retention and sales.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg text-sm border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {/* Templates */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Start from a template
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PIPELINE_TEMPLATES.map((tpl) => (
            <button
              key={tpl.type}
              onClick={() => applyTemplate(tpl)}
              className={`text-left p-4 border rounded-lg transition-all hover:shadow-md ${
                pipelineType === tpl.type
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
              }`}
            >
              <p className="font-medium text-gray-900 dark:text-white text-sm">
                {tpl.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {tpl.description}
              </p>
              <div className="flex gap-1 mt-2">
                {tpl.stages.map((s, i) => (
                  <div
                    key={i}
                    className="h-1.5 flex-1 rounded-full"
                    style={{ backgroundColor: s.color }}
                    title={s.name}
                  />
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Details */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Pipeline Details
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Pipeline Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Partner Onboarding"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this pipeline for?"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Stages */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Stages ({stages.length})
          </h2>
          <button
            onClick={addStage}
            className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
          >
            + Add Stage
          </button>
        </div>

        {/* Stage flow preview */}
        <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-2">
          {stages.map((stage, i) => (
            <div key={stage.id} className="flex items-center flex-shrink-0">
              <div
                className="px-3 py-1 rounded text-white text-xs font-medium"
                style={{ backgroundColor: stage.color }}
              >
                {stage.name || `Stage ${i + 1}`}
              </div>
              {i < stages.length - 1 && (
                <span className="text-gray-400 mx-1">&rarr;</span>
              )}
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {stages.map((stage, index) => (
            <div
              key={stage.id}
              className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg"
            >
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => moveStage(index, 'up')}
                  disabled={index === 0}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs leading-none"
                >
                  &#9650;
                </button>
                <button
                  onClick={() => moveStage(index, 'down')}
                  disabled={index === stages.length - 1}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs leading-none"
                >
                  &#9660;
                </button>
              </div>

              <span className="text-xs text-gray-400 w-4">{index + 1}</span>

              <input
                type="color"
                value={stage.color}
                onChange={(e) => updateStage(stage.id, 'color', e.target.value)}
                className="w-8 h-8 rounded border-0 cursor-pointer"
              />

              <input
                type="text"
                value={stage.name}
                onChange={(e) => updateStage(stage.id, 'name', e.target.value)}
                placeholder={`Stage ${index + 1} name`}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 text-sm"
              />

              {stages.length > 2 && (
                <button
                  onClick={() => removeStage(stage.id)}
                  className="text-gray-400 hover:text-red-500 p-1"
                >
                  &#10005;
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium"
        >
          {saving ? 'Creating...' : 'Create Pipeline'}
        </button>
        <button
          onClick={() => router.back()}
          className="px-6 py-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-800"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
