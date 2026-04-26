// src/app/api/birthday/check/route.ts
// Add to cron job alongside sequence processing
// URL: /api/birthday/check?secret=YOUR_CRON_SECRET

import { getAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

const CRON_SECRET = process.env.CRON_SECRET || 'tb-cron-2026'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  if (searchParams.get('secret') !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseAdmin = getAdminClient()
  const today = new Date()
  const month = today.getMonth() + 1
  const day = today.getDate()

  // Find users with birthdays today
  const { data: birthdayUsers } = await supabaseAdmin
    .from('users')
    .select('id, full_name, email, org_id')
    .not('date_of_birth', 'is', null)

  const birthdayPeople = (birthdayUsers || []).filter(u => {
    if (!u.date_of_birth) return false
    const dob = new Date(u.date_of_birth)
    return dob.getMonth() + 1 === month && dob.getDate() === day
  })

  // Find contacts with birthdays today (notify their account managers)
  const { data: birthdayContacts } = await supabaseAdmin
    .from('contacts')
    .select('id, full_name, date_of_birth, account_id, account:accounts(name, assigned_user_id, assigned_user:users!accounts_assigned_user_id_fkey(email, full_name))')
    .not('date_of_birth', 'is', null)

  const contactBirthdays = (birthdayContacts || []).filter(c => {
    if (!c.date_of_birth) return false
    const dob = new Date(c.date_of_birth)
    return dob.getMonth() + 1 === month && dob.getDate() === day
  })

  let sentCount = 0

  // Send birthday emails to users
  for (const user of birthdayPeople) {
    const firstName = user.full_name?.split(' ')[0] || 'there'
    // Create a notification
    await supabaseAdmin.from('notifications').insert({
      user_id: user.id,
      org_id: user.org_id,
      type: 'system',
      title: `Happy birthday, ${firstName}! 🎂`,
      message: 'The TrailBlaze CRM team wishes you a wonderful day. Thank you for being part of our community.',
    })
    sentCount++

    // TODO: Send actual email via MailerSend when configured
  }

  // Notify account managers about client birthdays
  for (const contact of contactBirthdays) {
    const account = contact.account as any
    if (!account?.assigned_user_id) continue

    await supabaseAdmin.from('notifications').insert({
      user_id: account.assigned_user_id,
      org_id: account.org_id || null,
      type: 'system',
      title: `🎂 ${contact.full_name}'s birthday is today`,
      message: `Your contact at ${account.name} has a birthday today. A personal message could strengthen the relationship.`,
    })
    sentCount++
  }

  return NextResponse.json({
    checked: true,
    date: `${month}/${day}`,
    user_birthdays: birthdayPeople.length,
    contact_birthdays: contactBirthdays.length,
    notifications_sent: sentCount,
  })
}
