// src/components/ui/UpgradePrompt.tsx
'use client'

import Link from 'next/link'
import type { Feature } from '@/lib/plans'
import { getUpgradeMessage } from '@/lib/plans'

interface UpgradePromptProps {
  feature: Feature
  inline?: boolean // compact version for inline use
}

export default function UpgradePrompt({ feature, inline = false }: UpgradePromptProps) {
  const msg = getUpgradeMessage(feature)

  if (inline) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-purple-50 border border-purple-200 rounded-lg">
        <div className="flex-1">
          <span className="text-sm font-medium text-purple-900">{msg.title}</span>
          <span className="text-sm text-purple-700 ml-1">— available on {msg.requiredPlan} plan and above.</span>
        </div>
        <Link href="/settings" className="px-3 py-1.5 rounded-md text-xs font-medium text-white flex-shrink-0"
          style={{ background: '#2b0548' }}>
          Upgrade
        </Link>
      </div>
    )
  }

  return (
    <div className="text-center py-12 px-6 max-w-md mx-auto">
      <div className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center"
        style={{ background: '#2b054815' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5a1890" strokeWidth="2">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{msg.title}</h3>
      <p className="text-sm text-gray-500 mb-6">{msg.description}</p>
      <Link href="/settings"
        className="inline-block px-6 py-2.5 rounded-lg text-sm font-medium"
        style={{ background: '#2b0548', color: '#e1b3ee' }}>
        Upgrade to {msg.requiredPlan}
      </Link>
      <p className="text-xs text-gray-400 mt-3">
        Currently on beta? All features are unlocked during the beta period.
      </p>
    </div>
  )
}
