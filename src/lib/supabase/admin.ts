// src/lib/supabase/admin.ts
// Admin client with service role key — bypasses RLS
// Used in cron jobs, webhooks, and admin operations
import { createClient } from '@supabase/supabase-js'

let adminClient: ReturnType<typeof createClient> | null = null

export function getAdminClient() {
  if (adminClient) return adminClient

  adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  return adminClient
}
