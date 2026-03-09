# ReviveOS

AI-powered lead revival and outreach platform. Resurrect dead leads with personalized, multi-channel campaigns.

## Features

- **Lead Management** - Import, enrich, and score leads with AI
- **AI Message Generation** - Personalized outreach using context-aware AI
- **Multi-channel Outreach** - Email and SMS/WhatsApp campaigns
- **Approval Workflow** - Review AI-generated messages before sending
- **Playbooks** - Reusable templates for different revival strategies
- **Analytics** - Track opens, clicks, replies, and conversions
- **Multi-tenant** - Workspace isolation with role-based access
- **Subscriptions** - PayPal-based billing with plan limits

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **AI**: Lovable AI (Gemini, GPT models)
- **Email**: Resend
- **SMS**: Twilio
- **Payments**: PayPal

## Quick Start (Local Development)

```bash
# Clone the repository
git clone <YOUR_REPO_URL>
cd <REPO_NAME>

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your Supabase credentials

# Start development server
npm run dev
```

Open [http://localhost:8080](http://localhost:8080)

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project ID |

## Documentation

| Document | Description |
|----------|-------------|
| [Self-Hosting Guide](docs/SELF_HOSTING.md) | Complete self-hosting setup |
| [Deployment Guide](docs/DEPLOYMENT.md) | Deploy to Vercel, Netlify, Docker |
| [Edge Functions](docs/EDGE_FUNCTIONS.md) | Backend function reference |
| [Database Schema](docs/DATABASE.md) | Complete schema documentation |

## Project Structure

```
├── src/
│   ├── components/     # React components
│   ├── pages/          # Route pages
│   ├── contexts/       # React contexts (Auth, Workspace)
│   ├── hooks/          # Custom hooks
│   ├── lib/            # Utilities
│   └── integrations/   # Supabase client & types
├── supabase/
│   ├── functions/      # Edge functions
│   ├── migrations/     # Database migrations
│   └── config.toml     # Supabase config
├── docs/               # Documentation
└── public/             # Static assets
```

## Scripts

```bash
npm run dev       # Start dev server
npm run build     # Production build
npm run preview   # Preview production build
npm run test      # Run tests
npm run lint      # Lint code
```

## Self-Hosting

See [Self-Hosting Guide](docs/SELF_HOSTING.md) for complete instructions.

**TL;DR:**
1. Create a Supabase project
2. Push migrations: `supabase db push`
3. Deploy functions: `supabase functions deploy`
4. Set secrets in Supabase dashboard
5. Deploy frontend to Vercel/Netlify

## Deployment

See [Deployment Guide](docs/DEPLOYMENT.md) for platform-specific instructions.

**Quick Deploy:**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=YOUR_REPO_URL)

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=YOUR_REPO_URL)

## Required Secrets (Edge Functions)

| Secret | Required For |
|--------|--------------|
| `LOVABLE_API_KEY` | AI generation |
| `RESEND_API_KEY` | Email sending |
| `TWILIO_ACCOUNT_SID` | SMS/WhatsApp |
| `TWILIO_AUTH_TOKEN` | SMS/WhatsApp |
| `TWILIO_PHONE_NUMBER` | SMS/WhatsApp |
| `PAYPAL_CLIENT_ID` | Subscriptions |
| `PAYPAL_SECRET_KEY` | Subscriptions |

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Browser   │────▶│   Supabase   │────▶│  Edge Func  │
│  (React)    │◀────│  (Postgres)  │◀────│  (Deno)     │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    │             │
               ┌────▼────┐  ┌─────▼─────┐
               │ Resend  │  │  Twilio   │
               │ (Email) │  │ (SMS/WA)  │
               └─────────┘  └───────────┘
```

## Security

- Row-Level Security (RLS) on all tables
- Workspace isolation via membership checks
- JWT validation in edge functions
- Credentials encrypted in database
- Admin roles in separate table (not profiles)

## License

MIT

## Support

- [Documentation](docs/)
- [GitHub Issues](../../issues)
