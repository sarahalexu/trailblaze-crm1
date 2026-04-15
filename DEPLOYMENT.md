# TrailBlaze CRM — Deployment Guide
## From Zero to Live in 10 Steps

This guide takes you from the zip file to a live, working CRM at your custom domain.
Every step includes the exact commands to type and buttons to click.

---

## STEP 1: Set Up Supabase (Your Database)

1. Go to **https://supabase.com** and click "Start your project"
2. Sign up with GitHub (recommended) or email
3. Click "New Project"
   - **Name:** TrailBlaze CRM
   - **Database Password:** Generate a strong one and SAVE IT somewhere secure
   - **Region:** Choose the closest to Lagos (Europe West or any available)
4. Wait 2 minutes for the project to provision
5. Once ready, go to **Project Settings → API** (left sidebar)
6. Copy these two values — you'll need them:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)
   - **service_role** key (another long string — keep this SECRET)

## STEP 2: Create Your Database Tables

1. In Supabase, click **SQL Editor** in the left sidebar
2. Click "New Query"
3. Open the file `supabase/migrations/001_initial_schema.sql` from the project
4. Copy ALL the content and paste it into the SQL Editor
5. Click **Run** (green button). Wait for "Success"
6. Create another new query
7. Open `supabase/migrations/002_org_setup_function.sql`
8. Copy ALL content, paste, and click **Run**
9. Go to **Table Editor** in the sidebar — you should see all 20 tables

## STEP 3: Enable Authentication

1. In Supabase, go to **Authentication → Providers**
2. **Email** should already be enabled (default)
3. To enable **Google login:**
   - Go to https://console.cloud.google.com
   - Create a project or use existing one
   - Go to APIs & Services → Credentials
   - Create OAuth 2.0 Client ID (Web application)
   - Add authorized redirect URI: `https://xxxxx.supabase.co/auth/v1/callback`
   - Copy the **Client ID** and **Client Secret**
   - Back in Supabase → Authentication → Providers → Google
   - Toggle ON, paste Client ID and Secret, Save
4. In Supabase → Authentication → URL Configuration:
   - Set **Site URL** to your domain (e.g., `https://app.trailblazecrm.com`)
   - Add redirect URLs: `https://app.trailblazecrm.com/auth/callback`

## STEP 4: Set Up GitHub Repository

1. Go to **https://github.com** and sign in (or create account)
2. Click the **+** icon → "New repository"
   - **Name:** trailblaze-crm
   - **Visibility:** Private
   - DO NOT initialize with README (we have one)
3. On your computer, open Terminal (Mac) or Command Prompt (Windows)
4. Navigate to where you extracted the zip file:
   ```
   cd path/to/trailblaze-crm
   ```
5. Run these commands one by one:
   ```
   git init
   git add .
   git commit -m "Initial commit - TrailBlaze CRM v1"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/trailblaze-crm.git
   git push -u origin main
   ```
6. Refresh your GitHub page — you should see all the files

## STEP 5: Deploy to Vercel

1. Go to **https://vercel.com** and sign up with GitHub
2. Click "Add New Project"
3. Find and select your **trailblaze-crm** repository
4. Vercel will auto-detect it's a Next.js project
5. Before clicking Deploy, expand **Environment Variables** and add:

   | Name | Value |
   |------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |
   | `NEXT_PUBLIC_APP_URL` | `https://your-vercel-url.vercel.app` (update later with custom domain) |
   | `ENCRYPTION_KEY` | Any 32-character random string |

6. Click **Deploy**
7. Wait 2-3 minutes. Vercel will build and deploy
8. You'll get a URL like `trailblaze-crm-xxxx.vercel.app` — this is your live app!

## STEP 6: Connect Your Custom Domain

1. In Vercel, go to your project → **Settings → Domains**
2. Add your domain: `app.trailblazecrm.com`
3. Vercel will show you DNS records to add
4. Go to your domain registrar (e.g., Namecheap, where your cPanel is)
5. Add the DNS records Vercel shows (usually a CNAME record)
6. Wait 5-30 minutes for DNS to propagate
7. Back in Vercel, click "Refresh" — should show ✓ Valid
8. Update your Vercel environment variable `NEXT_PUBLIC_APP_URL` to `https://app.trailblazecrm.com`
9. Update your Supabase Site URL and redirect URLs to match

## STEP 7: Set Up WhatsApp Business API (when ready)

1. Go to **https://developers.facebook.com**
2. Create a Meta Developer account if you don't have one
3. Create a new app → Select "Business" type
4. Add the **WhatsApp** product
5. In WhatsApp → API Setup:
   - You'll get a temporary **Access Token** (for testing)
   - You'll get a **Phone Number ID**
   - You'll get a **Business Account ID**
6. Set up your webhook:
   - Webhook URL: `https://app.trailblazecrm.com/api/whatsapp/webhook`
   - Verify Token: Choose any secret string
   - Subscribe to: `messages` field
7. Add these to your Vercel environment variables:

   | Name | Value |
   |------|-------|
   | `WHATSAPP_ACCESS_TOKEN` | Your access token |
   | `WHATSAPP_PHONE_NUMBER_ID` | Your phone number ID |
   | `WHATSAPP_BUSINESS_ACCOUNT_ID` | Your business account ID |
   | `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Your chosen verify token |

8. For production, you'll need to verify your business and get a permanent access token

## STEP 8: Set Up Gemini AI (when ready)

1. Go to **https://aistudio.google.com/apikey**
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key
5. Add to Vercel environment variables:

   | Name | Value |
   |------|-------|
   | `GEMINI_API_KEY` | Your Gemini API key |

6. Redeploy: In Vercel, go to Deployments → click "..." → Redeploy

## STEP 9: Set Up Paystack (for paid plans — do this before beta ends)

1. Go to **https://dashboard.paystack.com** and create an account
2. Complete business verification (takes 1-2 days)
3. Go to **Settings → API Keys & Webhooks**
4. Copy your **Secret Key** (starts with `sk_test_` for testing, `sk_live_` for production)
5. Copy your **Public Key** (starts with `pk_test_` or `pk_live_`)
6. Set up your webhook:
   - Webhook URL: `https://app.trailblazecrm.com/api/billing/webhook`
   - Enable events: `charge.success`, `subscription.disable`, `subscription.not_renew`, `invoice.payment_failed`
7. Add to Vercel environment variables:

   | Name | Value |
   |------|-------|
   | `PAYSTACK_SECRET_KEY` | Your secret key |
   | `PAYSTACK_PUBLIC_KEY` | Your public key |

8. Start with test keys during beta, switch to live keys when ready

## STEP 10: Test Everything

1. Open your live URL
2. Click "Create one free" to sign up
3. Complete the signup flow (check the terms checkbox!)
4. You should land on the onboarding wizard
5. Add your first test account
6. Verify you can see the dashboard, pipelines, and reports
7. Try updating a KEEP score
8. If anything breaks, check Vercel → Deployments → click the deployment → Logs

## STEP 11: Go Live

Before announcing to beta users:

- [ ] Test signup flow end-to-end
- [ ] Test login and logout
- [ ] Test account creation and KEEP scoring
- [ ] Test both pipeline views
- [ ] Test settings (profile update, export data)
- [ ] Verify super admin access at /admin with your email
- [ ] Update SUPER_ADMIN_EMAILS in src/lib/super-admin.ts with your actual email
- [ ] Confirm legal pages load correctly at /legal/terms and /legal/privacy
- [ ] Test on mobile browser
- [ ] Send yourself a test WhatsApp message (if configured)

---

## UPDATING THE APP

When I give you updated files:

1. Replace the file in your local project folder
2. In terminal, from the project folder:
   ```
   git add .
   git commit -m "Description of what changed"
   git push
   ```
3. Vercel auto-deploys on every push — your changes go live in ~2 minutes

## TROUBLESHOOTING

**"Module not found" error on Vercel:**
Run `npm install` locally, then push the updated package-lock.json

**Database tables not showing:**
Re-run the SQL migrations in Supabase SQL Editor

**Login not working:**
Check that your Supabase URL and anon key are correct in Vercel env vars

**WhatsApp messages not arriving:**
Check the webhook URL is correct and the verify token matches

**Need help?**
Start a new conversation with me and describe the error — include any error messages you see in Vercel logs or browser console.
