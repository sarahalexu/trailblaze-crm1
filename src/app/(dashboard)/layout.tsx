// src/app/(dashboard)/layout.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import type { User, Organization } from '@/lib/types'
import { getVisibleNavItems } from '@/lib/rbac'
import GuidedTooltips from '@/components/ui/GuidedTooltips'
import ProductTour from '@/components/ui/ProductTour'
import Icons from '@/components/ui/Icons'

const allNavItems = [
  { label: 'Overview', items: [
    { name: 'Dashboard', href: '/dashboard', icon: Icons.dashboard },
    { name: 'Retention pipeline', href: '/pipeline/retention', icon: Icons.retention },
    { name: 'Sales pipeline', href: '/pipeline/sales', icon: Icons.sales },
  ]},
  { label: 'Manage', items: [
    { name: 'Accounts', href: '/accounts', icon: Icons.accounts },
    { name: 'Contacts', href: '/contacts', icon: Icons.contacts },
    { name: 'Interactions', href: '/interactions', icon: Icons.interactions },
    { name: 'Sequences', href: '/sequences', icon: Icons.sequences },
    { name: 'Playbooks', href: '/playbooks', icon: Icons.playbooks },
    { name: 'Snippets', href: '/snippets', icon: Icons.snippets },
  ]},
  { label: 'Insights', items: [
    { name: 'Reports', href: '/reports', icon: Icons.reports },
    { name: 'Revenue at risk', href: '/reports/revenue-at-risk', icon: Icons.risk },
  ]},
  { label: 'Support', items: [
    { name: 'Help centre', href: '/help', icon: Icons.help },
    { name: 'Settings', href: '/settings', icon: Icons.settings },
  ]},
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [org, setOrg] = useState<Organization | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [notifCount, setNotifCount] = useState(0)
  const [darkMode, setDarkMode] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  // Dark mode toggle
  useEffect(() => {
    const saved = localStorage.getItem('tb_dark_mode')
    if (saved === 'true') { setDarkMode(true); document.documentElement.classList.add('dark') }
  }, [])

  function toggleDarkMode() {
    const next = !darkMode
    setDarkMode(next)
    localStorage.setItem('tb_dark_mode', String(next))
    if (next) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }

  // Filter nav by role
  const visibleNames = user ? getVisibleNavItems(user.role) : []
  const navItems = allNavItems.map(section => ({
    ...section,
    items: section.items.filter(item => visibleNames.includes(item.name)),
  })).filter(section => section.items.length > 0)

  useEffect(() => {
    async function loadUser() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { router.push('/login'); return }

      // Get user profile
      const { data: profile } = await supabase
        .from('users')
        .select('*, organizations(*)')
        .eq('auth_id', authUser.id)
        .single()

      if (profile) {
        setUser(profile)
        setOrg(profile.organizations)
      }

      // Get unread notification count
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile?.id)
        .eq('is_read', false)

      setNotifCount(count || 0)
    }
    loadUser()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const initials = user?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??'

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Top bar */}
      <header className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-4 lg:px-6 flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          {/* Mobile menu toggle */}
          <button className="lg:hidden text-gray-500 p-1" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>

          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold"
              style={{ background: '#2b0548', color: '#e1b3ee' }}>TB</div>
            <div className="hidden sm:block">
              <span className="text-sm font-medium text-gray-900">TrailBlaze CRM</span>
              <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium"
                style={{ background: '#c9a54e', color: '#2b0548' }}>BETA</span>
            </div>
          </Link>
        </div>

        {/* Global search */}
        <div className="hidden md:block flex-1 max-w-md mx-8">
          <input
            type="text"
            placeholder="Search accounts, contacts, interactions..."
            className="w-full px-3.5 py-2 bg-gray-100 border-0 rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-3">
          {/* Notifications */}
          <Link href="/notifications" className="relative p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
            <Icons.bell className="w-5 h-5 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer" />
            {notifCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-medium rounded-full flex items-center justify-center">
                {notifCount > 9 ? '9+' : notifCount}
              </span>
            )}
          </Link>

          {/* User menu */}
          <Link href="/settings" className="flex items-center gap-2.5 cursor-pointer group">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium"
              style={{ background: '#2b0548', color: '#e1b3ee' }}>
              {initials}
            </div>
            <div className="hidden lg:block">
              <div className="text-sm font-medium text-gray-900 leading-tight">{user?.full_name || 'Loading...'}</div>
              <div className="text-xs text-gray-500 leading-tight">{org?.name || ''}</div>
            </div>
          </Link>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-14 left-0 z-20 w-52 bg-white border-r border-gray-200 overflow-y-auto transition-transform duration-200`}>
          <nav className="py-4">
            {navItems.map((section, i) => (
              <div key={i} className="mb-5 px-3">
                <div className="text-[10px] uppercase tracking-wider text-gray-400 font-medium px-2 mb-1.5">
                  {section.label}
                </div>
                {section.items.map(item => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                  return (
                    <Link key={item.href} href={item.href}
                      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] transition-colors ${
                        isActive
                          ? 'bg-purple-50 text-purple-900 font-medium'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                      onClick={() => { if (window.innerWidth < 1024) setSidebarOpen(false) }}
                    >
                      <span className="opacity-50 group-hover:opacity-80 transition-opacity">{item.icon({ className: 'w-[18px] h-[18px]' })}</span>
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            ))}
          </nav>

          {/* Plan badge at bottom */}
          <div className="px-5 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-xs text-gray-500 mb-0.5">Current plan</div>
                <span className="text-sm font-medium capitalize" style={{ color: '#5a1890' }}>
                  {org?.plan_tier || 'Beta'}
                </span>
              </div>
              {org?.plan_tier === 'starter' && (
                <Link href="/settings/billing" className="text-xs text-purple-700 hover:underline">Upgrade</Link>
              )}
            </div>
            <button onClick={toggleDarkMode} className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 w-full">
             {darkMode ? <Icons.sun className="w-4 h-4" /> : <Icons.moon className="w-4 h-4" />}
             <span>{darkMode ? 'Light mode' : 'Dark mode'}</span>
            </button>
          </div>
        </aside>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-10 bg-black/20" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-5 lg:p-6">
          {children}
          <GuidedTooltips />
          <ProductTour />
        </main>
      </div>
    </div>
  )
}
