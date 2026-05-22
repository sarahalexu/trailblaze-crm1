// src/app/(dashboard)/playbooks/new/page.tsx
// Custom Playbook Builder - lets Scale plan users create their own playbooks

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface PlaybookStep {
  id: string;
  step_number: number;
  title: string;
  description: string;
}

const ICONS = [
  { value: 'clipboard', label: 'Clipboard' },
  { value: 'shield', label: 'Shield' },
  { value: 'trending-up', label: 'Growth' },
  { value: 'users', label: 'Team' },
  { value: 'heart', label: 'Heart' },
  { value: 'zap', label: 'Lightning' },
  { value: 'target', label: 'Target' },
  { value: 'star', label: 'Star' },
  { value: 'refresh', label: 'Refresh' },
  { value: 'gift', label: 'Gift' },
];

const CATEGORIES = [
  'Onboarding',
  'Retention',
  'Upsell',
  'Recovery',
  'Renewal',
  'Expansion',
  'Health Check',
  'Offboarding',
  'Custom',
];

export default function NewPlaybookPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Custom');
  const [icon, setIcon] = useState('clipboard');
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [steps, setSteps] = useState<PlaybookStep[]>([
    { id: crypto.randomUUID(), step_number: 1, title: '', description: '' },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function addStep() {
    setSteps([
      ...steps,
      {
        id: crypto.randomUUID(),
        step_number: steps.length + 1,
        title: '',
        description: '',
      },
    ]);
  }

  function removeStep(id: string) {
    if (steps.length <= 1) return;
    const updated = steps
      .filter((s) => s.id !== id)
      .map((s, i) => ({ ...s, step_number: i + 1 }));
    setSteps(updated);
  }

  function updateStep(id: string, field: 'title' | 'description', value: string) {
    setSteps(steps.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  }

  function moveStep(index: number, direction: 'up' | 'down') {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === steps.length - 1) return;

    const newSteps = [...steps];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newSteps[index], newSteps[swapIndex]] = [newSteps[swapIndex], newSteps[index]];
    setSteps(newSteps.map((s, i) => ({ ...s, step_number: i + 1 })));
  }

  async function handleSave() {
    if (!name.trim()) {
      setError('Playbook name is required.');
      return;
    }

    const filledSteps = steps.filter((s) => s.title.trim());
    if (filledSteps.length === 0) {
      setError('Add at least one step with a title.');
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

      // Create the playbook
      const { data: playbook, error: pbError } = await supabase
        .from('playbooks')
        .insert({
          org_id: userData.org_id,
          name: name.trim(),
          description: description.trim(),
          category: category,
          icon: icon,
          estimated_duration: estimatedDuration.trim() || null,
          is_system_default: false,
          is_custom: true,
          is_active: true,
        })
        .select()
        .single();

      if (pbError) throw pbError;

      // Create the steps
      const stepInserts = filledSteps.map((s, i) => ({
        playbook_id: playbook.id,
        step_number: i + 1,
        title: s.title.trim(),
        description: s.description.trim(),
      }));

      const { error: stepsError } = await supabase
        .from('playbook_steps')
        .insert(stepInserts);

      if (stepsError) throw stepsError;

      router.push('/playbooks');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={() => router.back()}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-1"
          >
            &larr; Back to Playbooks
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Create Custom Playbook
          </h1>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg text-sm border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {/* Playbook Details */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Playbook Details
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Enterprise Onboarding Playbook"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this playbook for? When should it be used?"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Icon
              </label>
              <select
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 text-sm"
              >
                {ICONS.map((i) => (
                  <option key={i.value} value={i.value}>{i.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Est. Duration
              </label>
              <input
                type="text"
                value={estimatedDuration}
                onChange={(e) => setEstimatedDuration(e.target.value)}
                placeholder="e.g. 2 weeks"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Steps Builder */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Steps ({steps.length})
          </h2>
          <button
            onClick={addStep}
            className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium transition-colors"
          >
            + Add Step
          </button>
        </div>

        <div className="space-y-4">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 relative"
            >
              <div className="flex items-start gap-3">
                {/* Step number */}
                <div className="flex flex-col items-center gap-1 pt-1">
                  <span className="w-7 h-7 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {step.step_number}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => moveStep(index, 'up')}
                      disabled={index === 0}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs"
                      title="Move up"
                    >
                      &#9650;
                    </button>
                    <button
                      onClick={() => moveStep(index, 'down')}
                      disabled={index === steps.length - 1}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs"
                      title="Move down"
                    >
                      &#9660;
                    </button>
                  </div>
                </div>

                {/* Step content */}
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={step.title}
                    onChange={(e) => updateStep(step.id, 'title', e.target.value)}
                    placeholder={`Step ${step.step_number} title (e.g. Schedule kickoff call)`}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 text-sm"
                  />
                  <textarea
                    value={step.description}
                    onChange={(e) => updateStep(step.id, 'description', e.target.value)}
                    placeholder="Details, instructions, or notes for this step..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 text-sm"
                  />
                </div>

                {/* Remove button */}
                {steps.length > 1 && (
                  <button
                    onClick={() => removeStep(step.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                    title="Remove step"
                  >
                    &#10005;
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addStep}
          className="mt-4 w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-purple-400 hover:text-purple-500 transition-colors text-sm"
        >
          + Add another step
        </button>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium transition-colors"
        >
          {saving ? 'Creating Playbook...' : 'Create Playbook'}
        </button>
        <button
          onClick={() => router.back()}
          className="px-6 py-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
