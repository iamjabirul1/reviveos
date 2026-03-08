import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Save } from 'lucide-react';

const INDUSTRIES = [
  'SaaS / Technology', 'Marketing / Agency', 'Real Estate', 'Financial Services',
  'Healthcare', 'E-commerce', 'Education', 'Consulting', 'Manufacturing', 'Other',
];

const TEAM_SIZES = ['Solo', '2-5', '6-20', '21-50', '51-200', '200+'];

const GOALS = [
  { value: 'reactivate_leads', label: 'Reactivate stale leads' },
  { value: 'reduce_no_shows', label: 'Reduce no-shows' },
  { value: 'win_back_lost', label: 'Win back closed-lost deals' },
  { value: 'nurture_prospects', label: 'Nurture dormant prospects' },
  { value: 'increase_bookings', label: 'Increase booking rates' },
  { value: 'automate_followup', label: 'Automate follow-up sequences' },
];

const TONES = [
  { value: 'friendly', label: 'Friendly & Warm', desc: 'Casual, approachable' },
  { value: 'direct', label: 'Direct & Professional', desc: 'Concise, to the point' },
  { value: 'consultative', label: 'Consultative & Expert', desc: 'Authority-driven, value-led' },
  { value: 'playful', label: 'Playful & Bold', desc: 'Creative, attention-grabbing' },
];

export default function BusinessContextForm() {
  const { currentWorkspace, refetch } = useWorkspace();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [targetAudience, setTargetAudience] = useState('');
  const [avgDealSize, setAvgDealSize] = useState('');
  const [salesCycle, setSalesCycle] = useState('');
  const [preferredTone, setPreferredTone] = useState('friendly');
  const [brandVoice, setBrandVoice] = useState('');
  const [keyDifferentiators, setKeyDifferentiators] = useState('');
  const [avoidTopics, setAvoidTopics] = useState('');

  useEffect(() => {
    if (currentWorkspace?.business_context) {
      const ctx = currentWorkspace.business_context as Record<string, any>;
      setCompanyName(ctx.company_name ?? '');
      setIndustry(ctx.industry ?? '');
      setTeamSize(ctx.team_size ?? '');
      setWebsite(ctx.website ?? '');
      setDescription(ctx.description ?? '');
      setSelectedGoals(ctx.goals ?? []);
      setTargetAudience(ctx.target_audience ?? '');
      setAvgDealSize(ctx.avg_deal_size ?? '');
      setSalesCycle(ctx.sales_cycle ?? '');
      setPreferredTone(ctx.preferred_tone ?? 'friendly');
      setBrandVoice(ctx.brand_voice ?? '');
      setKeyDifferentiators(ctx.key_differentiators ?? '');
      setAvoidTopics(ctx.avoid_topics ?? '');
    }
  }, [currentWorkspace]);

  const toggleGoal = (g: string) =>
    setSelectedGoals(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);

  async function save() {
    if (!currentWorkspace) return;
    setSaving(true);
    const businessContext = {
      company_name: companyName, industry, team_size: teamSize, website, description,
      goals: selectedGoals, target_audience: targetAudience, avg_deal_size: avgDealSize,
      sales_cycle: salesCycle, preferred_tone: preferredTone, brand_voice: brandVoice,
      key_differentiators: keyDifferentiators, avoid_topics: avoidTopics,
    };

    const { error } = await supabase
      .from('workspaces')
      .update({ business_context: businessContext as any } as any)
      .eq('id', currentWorkspace.id);

    setSaving(false);
    if (error) {
      toast({ title: 'Error saving', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Business context updated', description: 'AI will use your updated info for personalization.' });
      await refetch();
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Company Details</CardTitle>
          <CardDescription>Basic information about your business</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Acme Inc" />
            </div>
            <div className="space-y-2">
              <Label>Industry</Label>
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Team Size</Label>
              <Select value={teamSize} onValueChange={setTeamSize}>
                <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                <SelectContent>
                  {TEAM_SIZES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://acme.com" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>What does your business do?</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="We help B2B SaaS companies reduce churn..." rows={3} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Goals & Audience</CardTitle>
          <CardDescription>What you're trying to achieve and who you're targeting</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Primary Goals</Label>
            <div className="flex flex-wrap gap-2">
              {GOALS.map(g => (
                <Badge key={g.value} variant={selectedGoals.includes(g.value) ? 'default' : 'outline'}
                  className="cursor-pointer px-3 py-1.5 text-sm" onClick={() => toggleGoal(g.value)}>
                  {g.label}
                </Badge>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Target Audience</Label>
            <Textarea value={targetAudience} onChange={e => setTargetAudience(e.target.value)}
              placeholder="e.g., VP of Sales at mid-market SaaS companies..." rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Average Deal Size</Label>
              <Input value={avgDealSize} onChange={e => setAvgDealSize(e.target.value)} placeholder="$5,000" />
            </div>
            <div className="space-y-2">
              <Label>Typical Sales Cycle</Label>
              <Input value={salesCycle} onChange={e => setSalesCycle(e.target.value)} placeholder="2-4 weeks" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Brand Voice</CardTitle>
          <CardDescription>How AI should communicate on your behalf</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Preferred Tone</Label>
            <div className="grid grid-cols-2 gap-3">
              {TONES.map(t => (
                <div key={t.value} onClick={() => setPreferredTone(t.value)}
                  className={`cursor-pointer rounded-lg border-2 p-3 transition-colors ${
                    preferredTone === t.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                  }`}>
                  <p className="font-medium text-sm">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.desc}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Brand Voice Notes</Label>
            <Textarea value={brandVoice} onChange={e => setBrandVoice(e.target.value)}
              placeholder="e.g., We never say 'just checking in'. We always lead with value..." rows={2} />
          </div>
          <div className="space-y-2">
            <Label>Key Differentiators</Label>
            <Textarea value={keyDifferentiators} onChange={e => setKeyDifferentiators(e.target.value)}
              placeholder="What makes your product/service unique?" rows={2} />
          </div>
          <div className="space-y-2">
            <Label>Topics to Avoid</Label>
            <Input value={avoidTopics} onChange={e => setAvoidTopics(e.target.value)}
              placeholder="e.g., competitor names, pricing, discounts" />
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving} className="w-full">
        <Save className="mr-2 h-4 w-4" /> {saving ? 'Saving...' : 'Save Business Context'}
      </Button>
    </div>
  );
}
