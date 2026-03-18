import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import IntakeWizard, { NapkinData, ScoredLead } from '@/components/discover/IntakeWizard';
import RevenueDashboard from '@/components/discover/RevenueDashboard';
import AIAdvisorChat from '@/components/discover/AIAdvisorChat';
import PaywallOverlay from '@/components/discover/PaywallOverlay';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

type Phase = 'intake' | 'results';

export default function Discover() {
  const [phase, setPhase] = useState<Phase>('intake');
  const [intakePath, setIntakePath] = useState<'napkin' | 'csv'>('napkin');
  const [napkinData, setNapkinData] = useState<NapkinData>();
  const [scoredLeads, setScoredLeads] = useState<ScoredLead[]>();

  const handleIntakeComplete = (data: { path: 'napkin' | 'csv'; napkinData?: NapkinData; scoredLeads?: ScoredLead[] }) => {
    setIntakePath(data.path);
    setNapkinData(data.napkinData);
    setScoredLeads(data.scoredLeads);
    setPhase('results');
  };

  if (phase === 'intake') {
    return (
      <>
        <Helmet>
          <title>Discover Your Hidden Revenue | ReviveOS</title>
          <meta name="description" content="Find out how much money is sitting in your dead leads. Get an instant pipeline analysis and AI-powered revival plan — free, no account needed." />
        </Helmet>
        <IntakeWizard onComplete={handleIntakeComplete} />
      </>
    );
  }

  // Compute context for AI chat
  let totalPipeline = 0;
  let leadCount = 0;
  let avgDealSize = 5000;
  let coldReason = 'timing';
  let websiteUrl = '';

  if (intakePath === 'napkin' && napkinData) {
    totalPipeline = napkinData.deadLeadCount * napkinData.avgDealSize;
    leadCount = napkinData.deadLeadCount;
    avgDealSize = napkinData.avgDealSize;
    coldReason = napkinData.coldReason;
    websiteUrl = napkinData.websiteUrl;
  } else if (intakePath === 'csv' && scoredLeads) {
    leadCount = scoredLeads.length;
    totalPipeline = scoredLeads.reduce((sum, l) => sum + (l.lead_value || 0), 0);
    if (totalPipeline === 0) totalPipeline = leadCount * 5000;
    avgDealSize = totalPipeline / leadCount;
  }

  const recoverableRevenue = Math.round(totalPipeline * 0.15);

  const chatContext = {
    leadCount,
    avgDealSize,
    coldReason,
    websiteUrl,
    totalPipeline,
    recoverableRevenue,
  };

  return (
    <>
      <Helmet>
        <title>Your Revenue Analysis | ReviveOS</title>
        <meta name="description" content="See your recoverable revenue breakdown and AI-powered revival strategy." />
      </Helmet>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => setPhase('intake')}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Start Over
              </Button>
              <div className="h-6 w-px bg-border" />
              <span className="font-bold text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> ReviveOS Discovery
              </span>
            </div>
            <Link to="/signup">
              <Button>Get Started Free</Button>
            </Link>
          </div>
        </header>

        {/* Main content: Dashboard + AI Chat side by side */}
        <main className="max-w-7xl mx-auto px-6 py-10">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground">Your Revenue Analysis</h1>
              <p className="text-muted-foreground mt-1">Here's what our AI found in your pipeline data.</p>
            </div>

            <div className="grid lg:grid-cols-5 gap-8">
              {/* Dashboard - 3 cols */}
              <div className="lg:col-span-3 space-y-8">
                <RevenueDashboard path={intakePath} napkinData={napkinData} scoredLeads={scoredLeads} />
              </div>

              {/* AI Chat - 2 cols */}
              <div className="lg:col-span-2">
                <div className="sticky top-24">
                  <AIAdvisorChat context={chatContext} />
                </div>
              </div>
            </div>

            {/* Paywall */}
            <div className="mt-12">
              <PaywallOverlay
                recoverableRevenue={recoverableRevenue}
                avgDealSize={avgDealSize}
                leadCount={leadCount}
              />
            </div>
          </motion.div>
        </main>
      </div>
    </>
  );
}
