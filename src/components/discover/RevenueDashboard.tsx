import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingUp, Target, AlertTriangle } from 'lucide-react';
import type { NapkinData, ScoredLead } from './IntakeWizard';

interface RevenueDashboardProps {
  path: 'napkin' | 'csv';
  napkinData?: NapkinData;
  scoredLeads?: ScoredLead[];
}

const BUCKET_COLORS: Record<string, string> = {
  revive_now: 'hsl(142, 71%, 45%)',
  review_first: 'hsl(38, 92%, 50%)',
  nurture_later: 'hsl(220, 70%, 50%)',
  suppress: 'hsl(215, 15%, 47%)',
};

const BUCKET_LABELS: Record<string, string> = {
  revive_now: 'Revive Now',
  review_first: 'Review First',
  nurture_later: 'Nurture Later',
  suppress: 'Suppress',
};

// Statistical distributions based on cold reason for napkin math
const DISTRIBUTIONS: Record<string, Record<string, number>> = {
  timing: { revive_now: 0.35, review_first: 0.30, nurture_later: 0.25, suppress: 0.10 },
  ghosted: { revive_now: 0.20, review_first: 0.35, nurture_later: 0.30, suppress: 0.15 },
  budget: { revive_now: 0.25, review_first: 0.30, nurture_later: 0.30, suppress: 0.15 },
  competitor: { revive_now: 0.15, review_first: 0.25, nurture_later: 0.35, suppress: 0.25 },
};

function AnimatedCounter({ target, prefix = '', suffix = '', duration = 1500 }: { target: number; prefix?: string; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(target * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);

  return <span>{prefix}{count.toLocaleString()}{suffix}</span>;
}

export default function RevenueDashboard({ path, napkinData, scoredLeads }: RevenueDashboardProps) {
  // Calculate pipeline values
  let totalPipeline = 0;
  let leadCount = 0;
  let bucketData: { name: string; value: number; label: string }[] = [];

  if (path === 'napkin' && napkinData) {
    totalPipeline = napkinData.deadLeadCount * napkinData.avgDealSize;
    leadCount = napkinData.deadLeadCount;
    const dist = DISTRIBUTIONS[napkinData.coldReason] || DISTRIBUTIONS.timing;
    bucketData = Object.entries(dist).map(([bucket, pct]) => ({
      name: bucket,
      value: Math.round(napkinData.deadLeadCount * pct),
      label: BUCKET_LABELS[bucket],
    }));
  } else if (path === 'csv' && scoredLeads) {
    leadCount = scoredLeads.length;
    totalPipeline = scoredLeads.reduce((sum, l) => sum + (l.lead_value || 0), 0);
    if (totalPipeline === 0) totalPipeline = leadCount * 5000; // fallback

    const counts: Record<string, number> = { revive_now: 0, review_first: 0, nurture_later: 0, suppress: 0 };
    scoredLeads.forEach((l) => { counts[l.bucket] = (counts[l.bucket] || 0) + 1; });
    bucketData = Object.entries(counts).map(([bucket, count]) => ({
      name: bucket,
      value: count,
      label: BUCKET_LABELS[bucket],
    }));
  }

  const recoverableRevenue = Math.round(totalPipeline * 0.15);
  const reviveNowCount = bucketData.find((b) => b.name === 'revive_now')?.value || 0;

  const chartConfig = {
    revive_now: { label: 'Revive Now', color: BUCKET_COLORS.revive_now },
    review_first: { label: 'Review First', color: BUCKET_COLORS.review_first },
    nurture_later: { label: 'Nurture Later', color: BUCKET_COLORS.nurture_later },
    suppress: { label: 'Suppress', color: BUCKET_COLORS.suppress },
  };

  return (
    <div className="space-y-8">
      {/* Hero stats */}
      <div className="grid md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-2 border-destructive/20 bg-destructive/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" /> Total Dormant Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-destructive">
                <AnimatedCounter target={totalPipeline} prefix="$" />
              </div>
              <p className="text-sm text-muted-foreground mt-1">sitting idle across {leadCount.toLocaleString()} leads</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-2 border-success/20 bg-success/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-success" /> Recoverable Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-success">
                <AnimatedCounter target={recoverableRevenue} prefix="$" />
              </div>
              <p className="text-sm text-muted-foreground mt-1">at 15% baseline win-back rate</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="border-2 border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" /> Ready to Revive
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-primary">
                <AnimatedCounter target={reviveNowCount} />
              </div>
              <p className="text-sm text-muted-foreground mt-1">high-priority leads in "Revive Now"</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Pie chart */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 }}>
        <Card>
          <CardHeader>
            <CardTitle>Lead Revival Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center gap-8">
              <ChartContainer config={chartConfig} className="h-[280px] w-[280px]">
                <PieChart>
                  <Pie
                    data={bucketData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    dataKey="value"
                    nameKey="label"
                    strokeWidth={2}
                  >
                    {bucketData.map((entry) => (
                      <Cell key={entry.name} fill={BUCKET_COLORS[entry.name]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>

              <div className="space-y-3 flex-1">
                {bucketData.map((b) => (
                  <div key={b.name} className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-sm shrink-0" style={{ backgroundColor: BUCKET_COLORS[b.name] }} />
                    <span className="font-medium text-foreground">{b.label}</span>
                    <span className="text-muted-foreground ml-auto">{b.value} leads</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Per-lead table for CSV path */}
      {path === 'csv' && scoredLeads && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
          <Card>
            <CardHeader>
              <CardTitle>Scored Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium">Name</th>
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium">Company</th>
                      <th className="text-center py-3 px-2 text-muted-foreground font-medium">Score</th>
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium">Bucket</th>
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium">Best Angle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scoredLeads.map((lead, i) => (
                      <tr
                        key={i}
                        className={`border-b border-border/50 ${i > 0 ? 'blur-[4px] select-none pointer-events-none' : ''}`}
                      >
                        <td className="py-3 px-2 font-medium text-foreground">{lead.first_name || '—'}</td>
                        <td className="py-3 px-2 text-muted-foreground">{lead.company || '—'}</td>
                        <td className="py-3 px-2 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                            lead.score >= 75 ? 'bg-success/10 text-success' :
                            lead.score >= 50 ? 'bg-warning/10 text-warning' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {lead.score}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: BUCKET_COLORS[lead.bucket] }} />
                            {BUCKET_LABELS[lead.bucket]}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-muted-foreground text-xs">{lead.best_angle}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {scoredLeads.length > 1 && (
                <p className="text-center text-sm text-muted-foreground mt-4">
                  🔒 Sign up to unlock all {scoredLeads.length} scored leads
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
