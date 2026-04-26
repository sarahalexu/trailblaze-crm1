// src/components/ui/FeedbackButton.tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePathname } from 'next/navigation'

export default function FeedbackButton() {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<'bug' | 'feature' | 'feedback'>('bug')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const pathname = usePathname()
  const supabase = createClient()

  async function submit() {
    if (!subject) return
    setSending(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase.from('users').select('id, org_id').eq('auth_id', user.id).single()

    await supabase.from('feedback').insert({
      org_id: profile?.org_id,
      user_id: profile?.id,
      type,
      page: pathname,
      subject,
      description,
      browser_info: navigator.userAgent,
    })

    setSending(false)
    setSent(true)
    setTimeout(() => { setSent(false); setOpen(false); setSubject(''); setDescription('') }, 2000)
  }

  return (
    <>
      {/* Floating button */}
      <button onClick={() => setOpen(true)}
        className="fixed bottom-6 left-6 z-30 w-10 h-10 rounded-full flex items-center justify-center text-sm shadow-lg transition-all hover:scale-110"
        style={{ background: '#2b0548', color: '#e1b3ee' }}
        title="Report a bug or send feedback">
        💬
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', animation: 'fadeIn 0.15s ease' }}
          onClick={() => setOpen(false)}>
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl" onClick={e => e.stopPropagation()}
            style={{ animation: 'slideUp 0.2s ease' }}>
            {/* Gradient header */}
            <div className="h-1 rounded-t-2xl" style={{ background: 'linear-gradient(90deg, #5a1890, #00adef, #c9a54e)' }} />

            <div className="p-5">
              {sent ? (
                <div className="text-center py-6" style={{ animation: 'fadeIn 0.2s ease' }}>
                  <div className="text-3xl mb-2">✓</div>
                  <h3 className="text-sm font-semibold text-gray-900">Thank you!</h3>
                  <p className="text-xs text-gray-500 mt-1">We'll review your {type === 'bug' ? 'report' : type} soon.</p>
                </div>
              ) : (
                <>
                  <h3 className="text-base font-semibold text-gray-900 mb-4">Send us feedback</h3>

                  {/* Type selector */}
                  <div className="flex gap-2 mb-4">
                    {[
                      { v: 'bug' as const, l: '🐛 Bug', desc: 'Something broken' },
                      { v: 'feature' as const, l: '💡 Feature', desc: 'Request a feature' },
                      { v: 'feedback' as const, l: '💬 Feedback', desc: 'General thoughts' },
                    ].map(t => (
                      <button key={t.v} onClick={() => setType(t.v)}
                        className={`flex-1 py-2.5 px-2 rounded-xl text-center border-2 transition-all ${type === t.v ? 'border-purple-300' : 'border-gray-100 hover:border-gray-200'}`}
                        style={type === t.v ? { background: 'rgba(90,24,144,0.05)' } : {}}>
                        <div className="text-sm">{t.l.split(' ')[0]}</div>
                        <div className="text-[10px] text-gray-500 mt-0.5">{t.desc}</div>
                      </button>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
                      placeholder={type === 'bug' ? "What's not working?" : type === 'feature' ? "What feature would help?" : "What's on your mind?"}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400"
                      style={{ transition: 'border-color 0.15s ease, box-shadow 0.15s ease' }}
                      onFocus={e => e.target.style.boxShadow = '0 0 0 3px rgba(90,24,144,0.08)'}
                      onBlur={e => e.target.style.boxShadow = 'none'} />

                    <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                      placeholder="Tell us more (optional)..."
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:border-purple-400"
                      onFocus={e => e.target.style.boxShadow = '0 0 0 3px rgba(90,24,144,0.08)'}
                      onBlur={e => e.target.style.boxShadow = 'none'} />

                    <div className="text-[10px] text-gray-400">
                      Page: {pathname} · We'll include your browser info automatically.
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button onClick={() => setOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                    <button onClick={submit} disabled={sending || !subject}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
                      style={{ background: '#2b0548', color: '#e1b3ee', boxShadow: '0 1px 3px rgba(43,5,72,0.3)' }}>
                      {sending ? 'Sending...' : 'Send'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
