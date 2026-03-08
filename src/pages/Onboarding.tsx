import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { ArrowRight, ArrowLeft, Building2, Target, MessageSquare, Sparkles } from 'lucide-react';

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

export default function Onboarding() {
  const navigate = useNavigate();
  const { currentWorkspace, refetch } = useWorkspace();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
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

  const toggleGoal = (g: string) =>
    setSelectedGoals(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);

  const steps = [
    { icon: Building2, title: 'Your Business', subtitle: 'Tell us about your company' },
    { icon: Target, title: 'Goals & Audience', subtitle: 'What are you trying to achieve?' },
    { icon: MessageSquare, title: 'Brand Voice', subtitle: 'How should AI communicate for you?' },
    { icon: Sparkles, title: 'Ready!', subtitle: 'AI will use this to hyper-personalize' },
  ];

  async function finish() {
    if (!currentWorkspace) return;
    setSaving(true);
    const businessContext = {
      company_name: companyName,
      industry,
      team_size: teamSize,
      website,
      description,
      goals: selectedGoals,
      target_audience: targetAudience,
      avg_deal_size: avgDealSize,
      sales_cycle: salesCycle,
      preferred_tone: preferredTone,
      brand_voice: brandVoice,
      key_differentiators: keyDifferentiators,
      avoid_topics: avoidTopics,
    };

    const { error } = await supabase
      .from('workspaces')
      .update({ business_context: businessContext as any, onboarding_completed: true } as any)
      .eq('id', currentWorkspace.id);

    setSaving(false);
    if (error) {
      toast({ title: 'Error saving', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '🎉 Onboarding complete!', description: 'AI will now use your business context for personalization' });
      refetch();
      navigate('/app');
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                i <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={`w-12 h-0.5 transition-colors ${i < step ? 'bg-primary' : 'bg-border'}`} />
              )}
            </div>
          ))}
        </div>

        <Card className="shadow-lg">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">{steps[step].title}</CardTitle>
            <CardDescription className="text-base">{steps[step].subtitle}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-4">
            {step === 0 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Company Name *</Label>
                    <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Acme Inc" />
                  </div>
                  <div className="space-y-2">
                    <Label>Industry *</Label>
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
                  <Textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="We help B2B SaaS companies reduce churn through predictive analytics..."
                    rows={3}
                  />
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div className="space-y-2">
                  <Label>Primary Goals (select all that apply)</Label>
                  <div className="flex flex-wrap gap-2">
                    {GOALS.map(g => (
                      <Badge
                        key={g.value}
                        variant={selectedGoals.includes(g.value) ? 'default' : 'outline'}
                        className="cursor-pointer px-3 py-1.5 text-sm"
                        onClick={() => toggleGoal(g.value)}
                      >
                        {g.label}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Who is your target audience?</Label>
                  <Textarea
                    value={targetAudience}
                    onChange={e => setTargetAudience(e.target.value)}
                    placeholder="e.g., VP of Sales at mid-market SaaS companies, small business owners in real estate..."
                    rows={2}
                  />
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
              </>
            )}

            {step === 2 && (
              <>
                <div className="space-y-2">
                  <Label>Preferred Communication Tone</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {TONES.map(t => (
                      <div
                        key={t.value}
                        onClick={() => setPreferredTone(t.value)}
                        className={`cursor-pointer rounded-lg border-2 p-3 transition-colors ${
                          preferredTone === t.value
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/30'
                        }`}
                      >
                        <p className="font-medium text-sm">{t.label}</p>
                        <p className="text-xs text-muted-foreground">{t.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Brand Voice Notes (optional)</Label>
                  <Textarea
                    value={brandVoice}
                    onChange={e => setBrandVoice(e.target.value)}
                    placeholder="e.g., We never say 'just checking in'. We always lead with value. We use data-driven language..."
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Key Differentiators</Label>
                  <Textarea
                    value={keyDifferentiators}
                    onChange={e => setKeyDifferentiators(e.target.value)}
                    placeholder="What makes your product/service unique? e.g., Only platform with real-time intent signals..."
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Topics to Avoid</Label>
                  <Input
                    value={avoidTopics}
                    onChange={e => setAvoidTopics(e.target.value)}
                    placeholder="e.g., competitor names, pricing, discounts"
                  />
                </div>
              </>
            )}

            {step === 3 && (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">You're all set!</h3>
                  <p className="text-muted-foreground mt-1">
                    AI will now use your business context to hyper-personalize every message, email, and SMS it generates.
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2 text-sm">
                  {companyName && <p><span className="font-medium">Company:</span> {companyName}</p>}
                  {industry && <p><span className="font-medium">Industry:</span> {industry}</p>}
                  {selectedGoals.length > 0 && (
                    <p><span className="font-medium">Goals:</span> {selectedGoals.map(g => GOALS.find(x => x.value === g)?.label).join(', ')}</p>
                  )}
                  {targetAudience && <p><span className="font-medium">Audience:</span> {targetAudience}</p>}
                  <p><span className="font-medium">Tone:</span> {TONES.find(t => t.value === preferredTone)?.label}</p>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === 0}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              {step < 3 ? (
                <Button onClick={() => setStep(s => s + 1)} disabled={step === 0 && (!companyName || !industry)}>
                  Next <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={finish} disabled={saving}>
                  {saving ? 'Saving...' : 'Launch Dashboard'} <Sparkles className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Skip */}
        {step < 3 && (
          <p className="text-center mt-4 text-sm text-muted-foreground">
            <button onClick={finish} className="underline hover:text-foreground transition-colors">
              Skip for now
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
