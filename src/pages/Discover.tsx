import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import IntakeWizard, { NapkinData, ScoredLead } from '@/components/discover/IntakeWizard';
import RevenueDashboard from '@/components/discover/RevenueDashboard';
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

        {/* Dashboard */}
        <main className="max-w-7xl mx-auto px-6 py-10">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground">Your Revenue Analysis</h1>
              <p className="text-muted-foreground mt-1">Here's what our AI found in your pipeline data.</p>
            </div>
            <RevenueDashboard path={intakePath} napkinData={napkinData} scoredLeads={scoredLeads} />
          </motion.div>

          {/* CTA section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="mt-12 text-center p-8 rounded-2xl border-2 border-primary/20 bg-primary/5"
          >
            <h2 className="text-2xl font-bold text-foreground mb-2">Ready to recover this revenue?</h2>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              ReviveOS will auto-generate personalized win-back campaigns for every lead in your pipeline — powered by AI.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link to="/signup">
                <Button size="lg" className="h-14 text-lg px-8">
                  Start Recovering Revenue <Sparkles className="h-5 w-5 ml-2" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </main>
      </div>
    </>
  );
}
