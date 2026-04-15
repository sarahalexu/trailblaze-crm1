// src/components/ui/GuidedTooltips.tsx
'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

interface Tooltip {
  page: string
  target: string // CSS selector or description
  title: string
  message: string
  position: 'top' | 'bottom' | 'left' | 'right'
}

const TOOLTIPS: Tooltip[] = [
  { page: '/dashboard', target: 'health-overview', title: 'Your account health at a glance', message: 'Every account is scored using the KEEP Framework (Know, Engage, Exceed, Prevent). Green is healthy, amber is at risk, red is critical. Click any account card to dive deeper.', position: 'bottom' },
  { page: '/dashboard', target: 'metrics-row', title: 'Key metrics', message: 'These numbers update in real-time. Revenue at Risk shows how much money is tied to unhealthy accounts. Renewals shows contracts expiring in the next 30 days.', position: 'bottom' },
  { page: '/pipeline/retention', target: 'retention-pipeline', title: 'Your retention pipeline', message: 'Drag accounts between stages as their status changes. Unlike a sales pipeline, this tracks what happens AFTER the sale. Accounts move from Onboarding through Active, Growth, and Renewal.', position: 'bottom' },
  { page: '/pipeline/sales', target: 'sales-pipeline', title: 'Sales pipeline', message: 'Track deals from Lead to Won. When you move a deal to "Won," it automatically creates an account in your retention pipeline. The handoff happens seamlessly.', position: 'bottom' },
  { page: '/sequences', target: 'sequences-page', title: 'Automated follow-ups', message: 'Create sequences of emails and WhatsApp messages that send automatically from your name. The sequence stops the moment someone replies. It feels personal — recipients don\'t know it\'s automated.', position: 'bottom' },
  { page: '/playbooks', target: 'playbooks-page', title: 'Guided workflows', message: 'Playbooks are step-by-step guides for common tasks: onboarding new clients, running quarterly reviews, recovering at-risk accounts, and more. Activate one on any account and track progress.', position: 'bottom' },
]

export default function GuidedTooltips() {
  const pathname = usePathname()
  const [currentTip, setCurrentTip] = useState<Tooltip | null>(null)
  const [dismissed, setDismissed] = useState<string[]>([])
  const [tipIndex, setTipIndex] = useState(0)

  useEffect(() => {
    // Load dismissed tooltips
    const saved = localStorage.getItem('tb_dismissed_tips')
    if (saved) setDismissed(JSON.parse(saved))
  }, [])

  useEffect(() => {
    // Find tooltip for current page
    const pageTips = TOOLTIPS.filter(t => pathname === t.page && !dismissed.includes(t.page + t.target))
    if (pageTips.length > 0) {
      // Show after a short delay so page renders first
      const timer = setTimeout(() => setCurrentTip(pageTips[0]), 1000)
      return () => clearTimeout(timer)
    } else {
      setCurrentTip(null)
    }
  }, [pathname, dismissed])

  function dismissTip() {
    if (!currentTip) return
    const key = currentTip.page + currentTip.target
    const updated = [...dismissed, key]
    setDismissed(updated)
    localStorage.setItem('tb_dismissed_tips', JSON.stringify(updated))
    setCurrentTip(null)
  }

  function dismissAll() {
    const allKeys = TOOLTIPS.map(t => t.page + t.target)
    setDismissed(allKeys)
    localStorage.setItem('tb_dismissed_tips', JSON.stringify(allKeys))
    setCurrentTip(null)
  }

  if (!currentTip) return null

  return (
    <div className="fixed bottom-6 right-6 z-40 max-w-sm">
      <div className="bg-white border border-purple-200 rounded-xl shadow-lg p-5 relative">
        {/* Purple accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{ background: '#5a1890' }} />
        
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: '#2b054815' }}>
            <span className="text-sm" role="img">💡</span>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-medium text-gray-900 mb-1">{currentTip.title}</h4>
            <p className="text-xs text-gray-600 leading-relaxed">{currentTip.message}</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
          <button onClick={dismissAll} className="text-xs text-gray-400 hover:text-gray-600">
            Don't show tips
          </button>
          <button onClick={dismissTip}
            className="px-3 py-1.5 rounded-md text-xs font-medium"
            style={{ background: '#2b0548', color: '#e1b3ee' }}>
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
