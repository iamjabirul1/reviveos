import { Building2, Newspaper, Calendar } from 'lucide-react';

interface Lead {
  first_name?: string | null; last_name?: string | null; email?: string | null;
  phone?: string | null; company?: string | null; source?: string | null; stage?: string | null;
  status?: string | null; lead_value?: number | null; revival_score?: number | null;
  revival_bucket?: string | null; best_channel?: string | null; best_angle?: string | null;
  suggested_cta?: string | null; last_contacted_at?: string | null; last_activity_at?: string | null;
  no_show_flag?: boolean | null; closed_lost_reason?: string | null;
  enrichment_json?: any;
}

export function LeadContextPanel({ lead }: { lead?: Lead | null }) {
  if (!lead) return <p className="text-sm text-muted-foreground">No lead data.</p>;
  const e = lead.enrichment_json || {};
  const news: any[] = Array.isArray(e.news) ? e.news : [];
  const events: any[] = Array.isArray(e.events) ? e.events : [];
  const signals: any[] = Array.isArray(e.signals) ? e.signals : [];
  const company = e.company || {};

  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-3 space-y-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Revival signals</p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><span className="text-muted-foreground">Score:</span> <span className="font-medium">{lead.revival_score ?? '—'}</span></div>
          <div><span className="text-muted-foreground">Bucket:</span> <span className="font-medium capitalize">{lead.revival_bucket?.replace('_', ' ') ?? '—'}</span></div>
          <div><span className="text-muted-foreground">Best channel:</span> <span className="font-medium capitalize">{lead.best_channel ?? '—'}</span></div>
          <div><span className="text-muted-foreground">Best angle:</span> <span className="font-medium">{lead.best_angle ?? '—'}</span></div>
          <div className="col-span-2"><span className="text-muted-foreground">Suggested CTA:</span> <span className="font-medium">{lead.suggested_cta ?? '—'}</span></div>
        </div>
      </div>

      <div className="border rounded-lg p-3 space-y-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
          <Building2 className="h-3 w-3" /> CRM context
        </p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><span className="text-muted-foreground">Source:</span> <span className="font-medium">{lead.source ?? '—'}</span></div>
          <div><span className="text-muted-foreground">Stage:</span> <span className="font-medium">{lead.stage ?? '—'}</span></div>
          <div><span className="text-muted-foreground">Status:</span> <span className="font-medium">{lead.status ?? '—'}</span></div>
          <div><span className="text-muted-foreground">Lead value:</span> <span className="font-medium">{lead.lead_value ? `$${Number(lead.lead_value).toLocaleString()}` : '—'}</span></div>
          <div><span className="text-muted-foreground">Last contact:</span> <span className="font-medium">{lead.last_contacted_at ? new Date(lead.last_contacted_at).toLocaleDateString() : '—'}</span></div>
          <div><span className="text-muted-foreground">Last activity:</span> <span className="font-medium">{lead.last_activity_at ? new Date(lead.last_activity_at).toLocaleDateString() : '—'}</span></div>
          {lead.closed_lost_reason && <div className="col-span-2"><span className="text-muted-foreground">Closed-lost:</span> <span className="font-medium">{lead.closed_lost_reason}</span></div>}
        </div>
      </div>

      {(company.name || company.industry || company.size || company.summary) && (
        <div className="border rounded-lg p-3 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <Building2 className="h-3 w-3" /> Company
          </p>
          <div className="text-sm space-y-1">
            {company.name && <p className="font-medium">{company.name}</p>}
            {(company.industry || company.size) && <p className="text-muted-foreground">{[company.industry, company.size].filter(Boolean).join(' · ')}</p>}
            {company.summary && <p className="text-muted-foreground">{company.summary}</p>}
          </div>
        </div>
      )}

      {news.length > 0 && (
        <div className="border rounded-lg p-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <Newspaper className="h-3 w-3" /> Recent news
          </p>
          <ul className="space-y-1.5 text-sm">
            {news.slice(0, 5).map((n: any, i: number) => (
              <li key={i}>
                {n.url ? <a href={n.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{n.title || n.headline || n.url}</a>
                  : <span>{n.title || n.headline}</span>}
                {n.date && <span className="text-muted-foreground text-xs ml-2">{new Date(n.date).toLocaleDateString()}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {events.length > 0 && (
        <div className="border rounded-lg p-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Events
          </p>
          <ul className="space-y-1.5 text-sm">
            {events.slice(0, 5).map((ev: any, i: number) => (
              <li key={i}>
                <span className="font-medium">{ev.title || ev.name}</span>
                {ev.date && <span className="text-muted-foreground text-xs ml-2">{new Date(ev.date).toLocaleDateString()}</span>}
                {ev.description && <p className="text-muted-foreground text-xs">{ev.description}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {signals.length > 0 && (
        <div className="border rounded-lg p-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Other signals</p>
          <ul className="space-y-1 text-sm">
            {signals.slice(0, 8).map((s: any, i: number) => (
              <li key={i} className="text-muted-foreground">• {typeof s === 'string' ? s : s.label || s.title || JSON.stringify(s)}</li>
            ))}
          </ul>
        </div>
      )}

      {news.length === 0 && events.length === 0 && signals.length === 0 && !company.name && (
        <p className="text-xs text-muted-foreground">No CRM enrichment or news data for this lead yet.</p>
      )}
    </div>
  );
}
