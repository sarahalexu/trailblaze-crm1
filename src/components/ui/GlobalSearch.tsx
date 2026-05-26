// src/components/ui/GlobalSearch.tsx
// Global search - replace the empty search input in the layout header

'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface SearchResult {
  id: string
  type: 'account' | 'contact' | 'interaction'
  title: string
  subtitle: string
  href: string
}

export default function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const router = useRouter()
  const debounceRef = useRef<NodeJS.Timeout>()

  // Keyboard shortcut: Cmd+K or Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setIsOpen(true)
      }
      if (e.key === 'Escape') {
        setIsOpen(false)
        inputRef.current?.blur()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleChange(value: string) {
    setQuery(value)
    setSelectedIdx(-1)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!value.trim()) {
      setResults([])
      return
    }

    debounceRef.current = setTimeout(() => search(value.trim()), 200)
  }

  async function search(q: string) {
    setLoading(true)
    const searchResults: SearchResult[] = []

    // Search accounts
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, name, industry, health_status')
      .or(`name.ilike.%${q}%,industry.ilike.%${q}%`)
      .limit(5)

    for (const a of accounts || []) {
      searchResults.push({
        id: a.id, type: 'account',
        title: a.name,
        subtitle: [a.industry, a.health_status].filter(Boolean).join(' \u00B7 '),
        href: `/accounts/${a.id}`,
      })
    }

    // Search contacts
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, full_name, email, job_title, account_id')
      .or(`full_name.ilike.%${q}%,email.ilike.%${q}%,job_title.ilike.%${q}%`)
      .limit(5)

    for (const c of contacts || []) {
      searchResults.push({
        id: c.id, type: 'contact',
        title: c.full_name,
        subtitle: [c.job_title, c.email].filter(Boolean).join(' \u00B7 '),
        href: `/contacts/${c.id}`,
      })
    }

    // Search interactions
    const { data: interactions } = await supabase
      .from('interactions')
      .select('id, subject, channel, created_at, account_id')
      .or(`subject.ilike.%${q}%,content.ilike.%${q}%`)
      .order('created_at', { ascending: false })
      .limit(3)

    for (const i of interactions || []) {
      searchResults.push({
        id: i.id, type: 'interaction',
        title: i.subject || i.channel,
        subtitle: `${i.channel} \u00B7 ${new Date(i.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}`,
        href: i.account_id ? `/accounts/${i.account_id}` : '/interactions',
      })
    }

    setResults(searchResults)
    setLoading(false)
  }

  function handleSelect(result: SearchResult) {
    router.push(result.href)
    setIsOpen(false)
    setQuery('')
    setResults([])
    inputRef.current?.blur()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx(prev => Math.min(prev + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && selectedIdx >= 0 && results[selectedIdx]) {
      handleSelect(results[selectedIdx])
    }
  }

  const typeIcons: Record<string, string> = {
    account: '\u{1F3E2}',
    contact: '\u{1F464}',
    interaction: '\u{1F4DD}',
  }

  const typeLabels: Record<string, string> = {
    account: 'Account',
    contact: 'Contact',
    interaction: 'Interaction',
  }

  return (
    <div className="relative flex-1 max-w-md">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { handleChange(e.target.value); setIsOpen(true) }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search accounts, contacts..."
          className="w-full px-3.5 py-2 bg-gray-100 border-0 rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white pr-16"
        />
        <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] text-gray-400 bg-gray-200/60 rounded border border-gray-300/50">
          {'\u2318'}K
        </kbd>
      </div>

      {/* Results dropdown */}
      {isOpen && (query.trim() || loading) && (
        <div ref={dropdownRef} className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden max-h-96 overflow-y-auto">
          {loading && (
            <div className="px-4 py-3 text-sm text-gray-400 flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-gray-200 border-t-purple-500 rounded-full animate-spin" />
              Searching...
            </div>
          )}

          {!loading && results.length === 0 && query.trim() && (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-gray-500">No results for &ldquo;{query}&rdquo;</p>
              <p className="text-xs text-gray-400 mt-1">Try a different search term</p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <>
              {/* Group by type */}
              {['account', 'contact', 'interaction'].map(type => {
                const typeResults = results.filter(r => r.type === type)
                if (typeResults.length === 0) return null
                return (
                  <div key={type}>
                    <div className="px-3 py-1.5 bg-gray-50 text-[10px] uppercase tracking-wider text-gray-400 font-medium">
                      {typeLabels[type]}s
                    </div>
                    {typeResults.map((result, i) => {
                      const globalIdx = results.indexOf(result)
                      return (
                        <button
                          key={result.id}
                          onClick={() => handleSelect(result)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                            globalIdx === selectedIdx ? 'bg-purple-50' : 'hover:bg-gray-50'
                          }`}
                        >
                          <span className="text-sm">{typeIcons[result.type]}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{result.title}</p>
                            <p className="text-xs text-gray-400 truncate">{result.subtitle}</p>
                          </div>
                          <span className="text-xs text-gray-300">{'\u2192'}</span>
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}
    </div>
  )
}
