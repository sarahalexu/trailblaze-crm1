# TrailBlaze CRM

**AI-powered account management platform with native WhatsApp integration, built for how African businesses actually operate.**

## Tech Stack

- **Frontend:** Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS
- **Database:** Supabase (PostgreSQL) with Row Level Security
- **AI:** Google Gemini API
- **WhatsApp:** Meta WhatsApp Cloud API
- **Deployment:** Vercel (frontend) + Supabase (backend)
- **State:** Zustand

## Project Structure

```
trailblaze-crm/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── (auth)/       # Login, signup, forgot password
│   │   ├── (dashboard)/  # Protected CRM routes
│   │   └── api/          # API routes (WhatsApp webhooks, AI endpoints)
│   ├── components/       # Reusable UI components
│   │   ├── ui/           # Base components (Button, Card, Input, etc.)
│   │   ├── accounts/     # Account-related components
│   │   ├── pipeline/     # Pipeline views
│   │   ├── playbooks/    # Playbook components
│   │   └── layout/       # Sidebar, topbar, navigation
│   ├── lib/              # Utilities and configuration
│   │   ├── supabase/     # Supabase client setup
│   │   ├── whatsapp/     # WhatsApp API helpers
│   │   ├── ai/           # Gemini API integration
│   │   └── types.ts      # TypeScript definitions
│   └── styles/           # Global styles
├── supabase/
│   └── migrations/       # Database migration files
├── public/               # Static assets
└── package.json
```

## Getting Started

### 1. Clone and install
```bash
git clone https://github.com/your-repo/trailblaze-crm.git
cd trailblaze-crm
npm install
```

### 2. Set up Supabase
1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the migration files in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_org_setup_function.sql`
3. Copy your project URL and anon key from Settings → API

### 3. Configure environment
```bash
cp .env.example .env.local
# Fill in your Supabase credentials
```

### 4. Run development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Database Schema

20 tables covering:
- **Multi-tenant organizations** with plan-based limits
- **Accounts** with KEEP Framework health scoring (auto-calculated)
- **Dual pipelines** (retention + sales) with auto deal-to-account conversion
- **WhatsApp message logging** with delivery status tracking
- **5 pre-loaded playbooks** with step-by-step workflows
- **Full audit trail** and notification system
- **Row Level Security** ensuring complete data isolation between organizations

## Key Features (MVP)

- [x] Database architecture (complete)
- [x] Authentication & multi-tenancy
- [ ] Account dashboard with KEEP health scores
- [ ] Retention pipeline (drag-and-drop)
- [ ] Sales pipeline with auto-account creation on won deals
- [ ] Interaction timeline
- [ ] WhatsApp Cloud API integration
- [ ] AI-powered risk detection & message drafting (Gemini)
- [ ] Built-in AM playbooks
- [ ] Reporting dashboard
- [ ] In-app support system

## Brand

- Primary: `#2b0548` (deep purple) + `#e1b3ee` (light purple)
- Secondary: `#5a1890` + `#63107e`
- Accent: `#00adef` (blue) + `#c9a54e` (gold)
- Neutral: `#7e7e7e`

---

Built by TrailBlaze Africa — Nigeria's first account management ecosystem.
