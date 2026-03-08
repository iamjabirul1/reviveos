import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Zap, ArrowRight, BarChart3, Shield, Clock, Users, CheckCircle } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl tracking-tight">ReviveOS</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost">Log in</Button>
            </Link>
            <Link to="/signup">
              <Button>Get Started <ArrowRight className="ml-1 h-4 w-4" /></Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4 text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <Zap className="h-4 w-4" /> Dormant Revenue Recovery OS
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
            Stop leaving money in your{' '}
            <span className="text-primary">dead pipeline</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            ReviveOS scores your stale leads, drafts context-aware win-back messages, 
            and books meetings — all with human approval controls built in.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup">
              <Button size="lg" className="text-base px-8">
                Start Recovering Revenue <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Import leads in 5 min · Launch first campaign in 15 min · See results day one
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 border-t bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">How ReviveOS Works</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { icon: Users, title: 'Import & Score', desc: 'Upload your CSV or connect your CRM. Every lead gets a revival score 0-100 with a clear explanation.' },
              { icon: BarChart3, title: 'AI-Powered Playbooks', desc: 'Choose from 5 proven playbooks. AI drafts personalized messages using old notes, stages, and objections.' },
              { icon: Shield, title: 'Approve & Send', desc: 'Review every message before it goes out. Built-in suppression lists and compliance controls.' },
            ].map((f) => (
              <div key={f.title} className="bg-card rounded-lg border p-6">
                <f.icon className="h-10 w-10 text-primary mb-4" />
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 border-t">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-12">Built for Revenue Recovery</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {[
              { value: '5 min', label: 'Import time' },
              { value: '15 min', label: 'First campaign' },
              { value: '100%', label: 'Human approval' },
              { value: '5', label: 'Playbook templates' },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-3xl font-bold text-primary">{s.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 border-t bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Perfect For</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {['Coaches & Consultants', 'Agencies & Freelancers', 'Recruiters', 'Clinics & Health', 'High-Ticket Services', 'SaaS Sales Teams'].map((item) => (
              <div key={item} className="flex items-center gap-3 bg-card rounded-lg border p-4">
                <CheckCircle className="h-5 w-5 text-success shrink-0" />
                <span className="font-medium">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 border-t">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <h2 className="text-3xl font-bold mb-4">Ready to recover your dead pipeline?</h2>
          <p className="text-muted-foreground mb-8">
            Your CRM is sitting on hidden revenue. ReviveOS finds it.
          </p>
          <Link to="/signup">
            <Button size="lg" className="text-base px-8">
              Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <span className="font-semibold">ReviveOS</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 ReviveOS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
