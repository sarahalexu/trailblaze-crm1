// src/components/ui/ProductTour.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

interface TourStep {
  title: string
  message: string
  page: string // the route to navigate to
  highlight?: string // description of what to look at
  action?: string // what to click/do
  emoji: string
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Welcome to TrailBlaze CRM!',
    message: "Let me show you around in 60 seconds. This tour highlights the features that make TrailBlaze different from every other CRM.",
    page: '/dashboard', emoji: '👋',
  },
  {
    title: 'Your Dashboard',
    message: "This is your command centre. The donut chart shows your account health distribution. The sparkline tracks your activity trend. Metric cards show revenue at risk and upcoming renewals. Everything updates in real-time.",
    page: '/dashboard', highlight: 'Look at the metric cards and charts above.', emoji: '📊',
  },
  {
    title: 'KEEP Health Scoring',
    message: "Every account is scored on 4 dimensions: Know (how well you understand the client), Engage (communication frequency), Exceed (going beyond expectations), and Prevent (spotting risks early). Each is 0-5, total out of 20. This is our proprietary framework — no other CRM has it.",
    page: '/accounts', highlight: 'Notice the KEEP score column on each account.', emoji: '💓',
  },
  {
    title: 'Retention Pipeline',
    message: "This is what makes TrailBlaze unique. Instead of just tracking sales, we track what happens AFTER the sale. Drag accounts between stages: Onboarding, Active, Growth, At Risk, Renewal, Churned.",
    page: '/pipeline/retention', highlight: 'Try dragging an account card between stages.', emoji: '↻',
  },
  {
    title: 'Sales Pipeline + Auto-Conversion',
    message: "We also have a traditional sales pipeline. The magic: when you mark a deal as 'Won', it automatically becomes an account in your retention pipeline. Sales-to-account-management handoff in one click.",
    page: '/pipeline/sales', highlight: 'Click "+ New deal" to add your first deal.', emoji: '🎯',
  },
  {
    title: 'Automated Sequences',
    message: "This is our killer feature. Set up follow-up emails and WhatsApp messages that send automatically from YOUR name. The sequence stops when someone replies. Your contacts think it's personal — they don't know it's automated.",
    page: '/sequences', highlight: 'Click "+ New sequence" to try it.', emoji: '⚡',
  },
  {
    title: 'AI-Powered Insights',
    message: "On any account page, click the AI buttons: Risk Analysis (predicts churn), Suggest Action (tells you what to do next), and Draft Message (writes a follow-up for you). Powered by Google Gemini.",
    page: '/accounts', highlight: 'Click into any account to see the AI buttons.', emoji: '🤖',
  },
  {
    title: 'Playbooks & Snippets',
    message: "Playbooks are guided step-by-step workflows for onboarding, QBRs, recovery, upselling, and renewals. Snippets are reusable message templates you can copy-paste quickly. Both save hours every week.",
    page: '/playbooks', highlight: 'Browse the 5 built-in playbooks.', emoji: '📋',
  },
  {
    title: "You're all set!",
    message: "That's TrailBlaze CRM. You now have KEEP scoring, retention pipeline, automated sequences, AI insights, playbooks, and more — all in one platform. Start by adding your client accounts or exploring the demo data we loaded for you.",
    page: '/dashboard', emoji: '🎉',
  },
]

export default function ProductTour() {
  const [active, setActive] = useState(false)
  const [step, setStep] = useState(0)
  const [hasSeenTour, setHasSeenTour] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const seen = localStorage.getItem('tb_tour_completed')
    if (!seen) { setHasSeenTour(false) }
  }, [])

  function startTour() {
    setActive(true)
    setStep(0)
    const firstPage = TOUR_STEPS[0].page
    if (pathname !== firstPage) router.push(firstPage)
  }

  function nextStep() {
    const next = step + 1
    if (next >= TOUR_STEPS.length) {
      endTour()
      return
    }
    setStep(next)
    const nextPage = TOUR_STEPS[next].page
    if (pathname !== nextPage) router.push(nextPage)
  }

  function prevStep() {
    if (step <= 0) return
    const prev = step - 1
    setStep(prev)
    const prevPage = TOUR_STEPS[prev].page
    if (pathname !== prevPage) router.push(prevPage)
  }

  function endTour() {
    setActive(false)
    setHasSeenTour(true)
    localStorage.setItem('tb_tour_completed', 'true')
  }

  // Prompt banner for new users
  if (!hasSeenTour && !active) {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-4" style={{ animation: 'slideUp 0.3s ease' }}>
        <div className="bg-white border border-purple-200 rounded-2xl shadow-lg p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, #5a1890, #00adef, #c9a54e)' }} />
          <div className="flex items-start gap-3">
            <span className="text-2xl">🚀</span>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Welcome to TrailBlaze CRM!</h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-3">Take a 60-second guided tour to see what makes this CRM different from anything you've used before.</p>
              <div className="flex gap-2">
                <button onClick={startTour} className="px-4 py-2 rounded-lg text-xs font-medium" style={{ background: '#2b0548', color: '#e1b3ee' }}>
                  Start tour
                </button>
                <button onClick={() => { setHasSeenTour(true); localStorage.setItem('tb_tour_completed', 'true') }}
                  className="px-4 py-2 text-xs text-gray-500 hover:text-gray-700">
                  Skip
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Active tour overlay
  if (!active) return null

  const current = TOUR_STEPS[step]
  const progress = ((step + 1) / TOUR_STEPS.length) * 100

  return (
    <>
      {/* Subtle overlay */}
      <div className="fixed inset-0 z-40 bg-black/10 pointer-events-none" />

      {/* Tour card */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4" style={{ animation: 'slideUp 0.2s ease' }}>
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
          {/* Progress bar */}
          <div className="h-1 bg-gray-100">
            <div className="h-full transition-all duration-500 ease-out" style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #5a1890, #00adef)' }} />
          </div>

          <div className="p-5">
            <div className="flex items-start gap-3 mb-3">
              <span className="text-2xl">{current.emoji}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-gray-900">{current.title}</h3>
                  <span className="text-[10px] text-gray-400">{step + 1}/{TOUR_STEPS.length}</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">{current.message}</p>
                {current.highlight && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs font-medium" style={{ color: '#5a1890' }}>
                    <span>👆</span> {current.highlight}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <button onClick={endTour} className="text-xs text-gray-400 hover:text-gray-600">End tour</button>
              <div className="flex gap-2">
                {step > 0 && (
                  <button onClick={prevStep} className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">Back</button>
                )}
                <button onClick={nextStep} className="px-4 py-1.5 rounded-lg text-xs font-medium"
                  style={{ background: '#2b0548', color: '#e1b3ee' }}>
                  {step === TOUR_STEPS.length - 1 ? "Let's go!" : 'Next'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
