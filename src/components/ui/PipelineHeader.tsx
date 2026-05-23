// src/components/ui/PipelineHeader.tsx
// Reusable header for pipeline pages with "Create Pipeline" button
// Add this to retention, sales, and any pipeline page:
//   import PipelineHeader from '@/components/ui/PipelineHeader'
//   <PipelineHeader title="Retention Pipeline" />

'use client'

import { useRouter } from 'next/navigation'
import { usePlanLimits } from '@/hooks/usePlanLimits'

interface PipelineHeaderProps {
  title: string
  subtitle?: string
  accountCount?: number
}

export default function PipelineHeader({ title, subtitle, accountCount }: PipelineHeaderProps) {
  const router = useRouter()
  const { check, UpgradeModal } = usePlanLimits()

  function handleCreatePipeline() {
    if (!check('custom_pipeline')) return
    router.push('/pipeline/create')
  }

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-medium text-gray-900">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
          {accountCount !== undefined && (
            <p className="text-sm text-gray-500 mt-0.5">{accountCount} accounts in this pipeline</p>
          )}
        </div>
        <button
          onClick={handleCreatePipeline}
          className="px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
        >
          + New pipeline
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-medium">Scale</span>
        </button>
      </div>
      <UpgradeModal />
    </>
  )
}
