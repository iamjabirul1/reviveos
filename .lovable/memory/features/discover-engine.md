Self-Serve Revenue Discovery Engine at /discover — public, no auth required

## Architecture
- IntakeWizard: Typeform-style wizard (napkin math 4-step OR CSV drop max 25 rows)
- RevenueDashboard: Pipeline stats + pie chart + lead table (CSV path blurred after 1st)
- AIAdvisorChat: Streaming chat via discover-ai-chat edge function (Gemini 3 Flash, Lovable AI Gateway)
- PaywallOverlay: ROI math + CTA to /signup?plan=growth or starter

## Files
- src/pages/Discover.tsx (orchestrator)
- src/components/discover/IntakeWizard.tsx
- src/components/discover/RevenueDashboard.tsx
- src/components/discover/AIAdvisorChat.tsx
- src/components/discover/PaywallOverlay.tsx
- supabase/functions/discover-ai-chat/index.ts

## Key Details
- Uses client-side scoreLead() from src/lib/scoring.ts
- AI rate limited by IP (20 msg / 30 min)
- Landing hero CTA links to /discover
- Pricing references: Starter $299/mo, Growth $599/mo
- No DB tables needed — fully stateless
