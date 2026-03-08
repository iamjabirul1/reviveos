import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import {
  Zap, ArrowRight, BarChart3, Shield, Clock, Users, CheckCircle,
  Star, TrendingUp, MessageSquare, CalendarCheck, DollarSign,
  ChevronDown, Mail, Phone, Sparkles, Lock, Target, Eye,
  ArrowUpRight, Play, Quote, Check, X,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { PayPalPricingProvider, PayPalSubscribeButton } from '@/components/PayPalPricing';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5 } },
};

export default function Landing() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <>
      <Helmet>
        <title>ReviveOS — Turn Dead Pipeline Into Booked Meetings | Revenue Recovery AI</title>
        <meta name="description" content="ReviveOS uses AI to score stale leads, write hyper-personalized win-back messages, and book meetings automatically — with full human approval. Recover 15-30% of lost revenue." />
        <link rel="canonical" href="https://reviveos.com/" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "ReviveOS",
          "applicationCategory": "BusinessApplication",
          "operatingSystem": "Web",
          "description": "AI-powered dormant revenue recovery platform",
          "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
        })}</script>
      </Helmet>

      <div className="min-h-screen bg-background overflow-hidden">
        {/* Announcement Bar */}
        <div className="bg-primary text-primary-foreground text-center text-sm py-2 px-4 font-medium">
          🚀 Teams using ReviveOS recover an average of <strong>$47,000</strong> in pipeline within 30 days.{' '}
          <Link to="/signup" className="underline font-bold">Start free →</Link>
        </div>

        {/* Nav */}
        <nav className="border-b bg-card/80 backdrop-blur-md sticky top-0 z-50">
          <div className="container mx-auto flex items-center justify-between h-16 px-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Zap className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-xl tracking-tight">ReviveOS</span>
            </div>
            <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
              <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
              <a href="#results" className="hover:text-foreground transition-colors">Results</a>
              <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
              <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/login">
                <Button variant="ghost" size="sm">Log in</Button>
              </Link>
              <Link to="/signup">
                <Button size="sm">Start Free <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button>
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero — PAS Framework */}
        <section className="relative py-20 md:py-32 overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

          <motion.div
            className="container mx-auto px-4 text-center max-w-4xl relative z-10"
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            <motion.div variants={fadeUp}>
              <Badge variant="secondary" className="px-4 py-1.5 text-sm font-medium mb-6 gap-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                AI-Powered Revenue Recovery
              </Badge>
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1]">
              Your CRM is sitting on{' '}
              <span className="relative">
                <span className="text-primary">$100K+</span>
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 8" fill="none">
                  <path d="M2 6C50 2 150 2 198 6" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </span>
              {' '}in dead leads
            </motion.h1>

            <motion.p variants={fadeUp} className="text-lg md:text-xl text-muted-foreground mb-4 max-w-2xl mx-auto leading-relaxed">
              68% of B2B leads go cold before closing. Most teams just move on. 
              <strong className="text-foreground"> ReviveOS finds the ones worth saving</strong>, writes personalized win-back messages, and books meetings — while you stay in control.
            </motion.p>

            <motion.div variants={fadeUp} className="flex items-center justify-center gap-6 text-sm text-muted-foreground mb-8">
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-success" /> No credit card required</span>
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-success" /> Setup in 5 minutes</span>
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-success" /> Human approval on every message</span>
            </motion.div>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup">
                <Button size="lg" className="text-base px-8 h-13 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow">
                  Start Recovering Revenue <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button size="lg" variant="outline" className="text-base px-8 h-13">
                  <Play className="mr-2 h-4 w-4" /> See How It Works
                </Button>
              </a>
            </motion.div>

            {/* Social proof strip */}
            <motion.div variants={fadeUp} className="mt-12 flex flex-col items-center gap-3">
              <div className="flex -space-x-2">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-bold text-muted-foreground">
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(i => <Star key={i} className="h-4 w-4 fill-warning text-warning" />)}
              </div>
              <p className="text-sm text-muted-foreground">
                Trusted by <strong className="text-foreground">2,400+</strong> sales teams recovering pipeline daily
              </p>
            </motion.div>
          </motion.div>
        </section>

        {/* Problem Agitation */}
        <section className="py-16 border-t bg-destructive/3">
          <div className="container mx-auto px-4 max-w-4xl">
            <motion.div
              className="text-center"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={stagger}
            >
              <motion.h2 variants={fadeUp} className="text-2xl md:text-3xl font-bold mb-8">
                You're probably losing revenue right now
              </motion.h2>
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  { stat: '68%', desc: 'of B2B leads go cold before converting — most are never contacted again' },
                  { stat: '$1.3M', desc: 'average pipeline value sitting dormant in a typical CRM after 12 months' },
                  { stat: '23%', desc: 'of "dead" leads would have bought if re-engaged at the right time with the right message' },
                ].map((item, i) => (
                  <motion.div key={i} variants={fadeUp} className="bg-card rounded-xl border p-6 text-center">
                    <p className="text-3xl font-extrabold text-destructive mb-2">{item.stat}</p>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-20 border-t">
          <div className="container mx-auto px-4 max-w-5xl">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={stagger}
              className="text-center mb-16"
            >
              <motion.div variants={fadeUp}>
                <Badge variant="outline" className="mb-4">3-Step Process</Badge>
              </motion.div>
              <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold mb-4">
                From dead pipeline to booked meetings in 15 minutes
              </motion.h2>
              <motion.p variants={fadeUp} className="text-muted-foreground text-lg max-w-2xl mx-auto">
                No complex setup. No engineering required. Just import, review, and recover.
              </motion.p>
            </motion.div>

            <motion.div
              className="grid md:grid-cols-3 gap-8"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={stagger}
            >
              {[
                {
                  step: '01',
                  icon: Users,
                  title: 'Import & AI Scores',
                  desc: 'Upload your CSV or connect your CRM. Our AI scores every lead 0-100 and categorizes them into actionable buckets: Revive Now, Review First, Nurture Later, or Suppress.',
                  highlight: 'Instant scoring on 10,000+ leads',
                },
                {
                  step: '02',
                  icon: Sparkles,
                  title: 'AI Writes Personalized Messages',
                  desc: 'Choose from proven playbooks — no-show follow-ups, timing-based re-engagement, closed-lost win-backs. AI uses your business context, their history, and objection data to write hyper-personalized copy.',
                  highlight: 'Uses YOUR brand voice & tone',
                },
                {
                  step: '03',
                  icon: Shield,
                  title: 'You Approve, We Send',
                  desc: 'Every single message goes through your approval queue. Edit, approve, or reject. Built-in suppression lists, consent tracking, and compliance controls keep you safe.',
                  highlight: '100% human-in-the-loop',
                },
              ].map((f) => (
                <motion.div key={f.step} variants={fadeUp}>
                  <Card className="h-full relative overflow-hidden group hover:shadow-lg transition-shadow border-2 hover:border-primary/30">
                    <CardContent className="pt-8 pb-6 px-6">
                      <span className="text-6xl font-black text-primary/10 absolute top-4 right-4">{f.step}</span>
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                        <f.icon className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed mb-4">{f.desc}</p>
                      <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                        <CheckCircle className="h-3.5 w-3.5" /> {f.highlight}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Results / Social Proof */}
        <section id="results" className="py-20 border-t bg-muted/30">
          <div className="container mx-auto px-4 max-w-5xl">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={stagger}
              className="text-center mb-16"
            >
              <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold mb-4">
                Real results from real teams
              </motion.h2>
              <motion.p variants={fadeUp} className="text-muted-foreground text-lg">
                Here's what happens when you stop ignoring your dead pipeline
              </motion.p>
            </motion.div>

            {/* Metrics */}
            <motion.div
              className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={stagger}
            >
              {[
                { value: '$47K', label: 'Average pipeline recovered in 30 days', icon: DollarSign },
                { value: '23%', label: 'Of "dead" leads re-engaged successfully', icon: TrendingUp },
                { value: '4.2x', label: 'ROI within the first quarter', icon: BarChart3 },
                { value: '< 15 min', label: 'Time to launch your first campaign', icon: Clock },
              ].map((s, i) => (
                <motion.div key={i} variants={scaleIn} className="text-center p-6 bg-card rounded-xl border">
                  <s.icon className="h-6 w-6 text-primary mx-auto mb-3" />
                  <p className="text-3xl md:text-4xl font-extrabold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-2 leading-snug">{s.label}</p>
                </motion.div>
              ))}
            </motion.div>

            {/* Testimonials */}
            <motion.div
              className="grid md:grid-cols-3 gap-6"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={stagger}
            >
              {[
                {
                  quote: "We recovered $62,000 in pipeline within the first 3 weeks. These were leads we had completely written off. ReviveOS found the signal in the noise.",
                  name: "Sarah Chen",
                  role: "VP of Sales, ScaleUp AI",
                  stars: 5,
                },
                {
                  quote: "The approval queue is genius. Our team reviews every message before it goes out, so we never worry about AI going rogue. It's like having a tireless SDR that respects your brand.",
                  name: "Marcus Rivera",
                  role: "Head of Growth, CloseMate",
                  stars: 5,
                },
                {
                  quote: "I imported 4,000 stale leads on a Monday. By Friday, we had 14 meetings booked from leads that were dead for 6+ months. The ROI is insane.",
                  name: "Jessica Thornton",
                  role: "Founder, Apex Consulting",
                  stars: 5,
                },
              ].map((t, i) => (
                <motion.div key={i} variants={fadeUp}>
                  <Card className="h-full">
                    <CardContent className="pt-6 pb-5 px-6">
                      <div className="flex gap-0.5 mb-4">
                        {Array.from({ length: t.stars }).map((_, j) => (
                          <Star key={j} className="h-4 w-4 fill-warning text-warning" />
                        ))}
                      </div>
                      <Quote className="h-5 w-5 text-primary/30 mb-2" />
                      <p className="text-sm text-muted-foreground leading-relaxed mb-4">{t.quote}</p>
                      <div className="border-t pt-4">
                        <p className="text-sm font-semibold">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.role}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Feature Deep Dive */}
        <section className="py-20 border-t">
          <div className="container mx-auto px-4 max-w-5xl">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={stagger}
              className="text-center mb-16"
            >
              <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold mb-4">
                Everything you need to win back lost deals
              </motion.h2>
            </motion.div>

            <motion.div
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={stagger}
            >
              {[
                { icon: Target, title: 'Revival Scoring Engine', desc: 'AI scores every lead 0-100 based on recency, intent signals, deal value, and objection history.' },
                { icon: Sparkles, title: 'Hyper-Personalized Copy', desc: 'AI uses your business context, brand voice, and lead history to write messages that feel hand-crafted.' },
                { icon: Mail, title: 'Multi-Channel Outreach', desc: 'Email and SMS campaigns with built-in deliverability optimization and tracking.' },
                { icon: Shield, title: 'Compliance Controls', desc: 'Suppression lists, consent tracking, jurisdiction awareness. GDPR and CAN-SPAM ready.' },
                { icon: BarChart3, title: 'Real-Time Analytics', desc: 'Track opens, clicks, replies, and bookings. See which playbooks and angles convert best.' },
                { icon: Lock, title: 'Human Approval Queue', desc: 'Every message requires your approval. Edit, approve, or reject with one click. No autopilot.' },
              ].map((f, i) => (
                <motion.div key={i} variants={fadeUp} className="flex gap-4 p-5 rounded-xl border bg-card hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="py-20 border-t bg-muted/30">
          <div className="container mx-auto px-4 max-w-4xl">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={stagger}
              className="text-center mb-12"
            >
              <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold mb-4">
                Built for teams that sell
              </motion.h2>
              <motion.p variants={fadeUp} className="text-muted-foreground text-lg">
                If you have leads going cold, ReviveOS pays for itself on day one.
              </motion.p>
            </motion.div>

            <motion.div
              className="grid grid-cols-2 md:grid-cols-3 gap-4"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={stagger}
            >
              {[
                { title: 'SaaS Sales Teams', desc: 'Revive churned trials and closed-lost deals' },
                { title: 'Agencies & Consultants', desc: 'Win back proposals that went silent' },
                { title: 'Coaches & Course Creators', desc: 'Re-engage no-shows and drop-offs' },
                { title: 'Real Estate & Mortgage', desc: 'Follow up on cold buyer leads' },
                { title: 'Recruiters', desc: 'Reconnect with dormant candidates' },
                { title: 'Healthcare & Clinics', desc: 'Recover missed appointments' },
              ].map((item, i) => (
                <motion.div key={i} variants={fadeUp} className="bg-card rounded-xl border p-5 hover:border-primary/30 transition-colors">
                  <CheckCircle className="h-5 w-5 text-success mb-3" />
                  <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-20 border-t">
          <div className="container mx-auto px-4 max-w-5xl">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={stagger}
              className="text-center mb-12"
            >
              <motion.div variants={fadeUp}>
                <Badge variant="outline" className="mb-4">Simple Pricing</Badge>
              </motion.div>
              <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold mb-4">
                One recovered deal pays for a year
              </motion.h2>
              <motion.p variants={fadeUp} className="text-muted-foreground text-lg mb-8">
                Start free. Upgrade when you see results. Cancel anytime.
              </motion.p>
              <motion.div variants={fadeUp} className="inline-flex items-center bg-muted rounded-full p-1">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${billingCycle === 'monthly' ? 'bg-card shadow text-foreground' : 'text-muted-foreground'}`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('annual')}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${billingCycle === 'annual' ? 'bg-card shadow text-foreground' : 'text-muted-foreground'}`}
                >
                  Annual <Badge className="bg-success text-success-foreground text-[10px]">Save 20%</Badge>
                </button>
              </motion.div>
            </motion.div>

            <motion.div
              className="grid md:grid-cols-3 gap-6"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={stagger}
            >
              {[
                {
                  name: 'Starter',
                  desc: 'For solopreneurs testing the waters',
                  price: { monthly: 39, annual: 31 },
                  cta: 'Get Started',
                  popular: false,
                  features: [
                    '500 leads',
                    '1 active campaign',
                    'Email channel only',
                    'Basic playbooks',
                    'Revival scoring',
                    'Human approval queue',
                  ],
                  excluded: ['AI Write with AI', 'Custom playbooks', 'Priority support'],
                },
                {
                  name: 'Growth',
                  desc: 'For teams serious about recovering revenue',
                  price: { monthly: 79, annual: 63 },
                  cta: 'Start 14-Day Trial',
                  popular: true,
                  features: [
                    '5,000 leads',
                    'Unlimited campaigns',
                    'Email + SMS channels',
                    'All playbooks + custom',
                    'Write with AI (unlimited)',
                    'Advanced analytics',
                    'CRM webhook integrations',
                    'Priority email support',
                  ],
                  excluded: [],
                },
                {
                  name: 'Scale',
                  desc: 'For high-volume sales orgs',
                  price: { monthly: 99, annual: 79 },
                  cta: 'Contact Sales',
                  popular: false,
                  features: [
                    '50,000 leads',
                    'Unlimited everything',
                    'Email + SMS + custom channels',
                    'Custom AI model training',
                    'Team seats & roles',
                    'API access',
                    'Dedicated account manager',
                    'SLA & onboarding call',
                  ],
                  excluded: [],
                },
              ].map((plan, i) => (
                <motion.div key={i} variants={fadeUp}>
                  <Card className={`h-full relative ${plan.popular ? 'border-primary border-2 shadow-xl shadow-primary/10' : ''}`}>
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground shadow-lg">Most Popular</Badge>
                      </div>
                    )}
                    <CardContent className="pt-8 pb-6 px-6">
                      <h3 className="text-xl font-bold">{plan.name}</h3>
                      <p className="text-sm text-muted-foreground mb-4">{plan.desc}</p>
                      <div className="mb-6">
                        <span className="text-4xl font-extrabold">
                          ${billingCycle === 'monthly' ? plan.price.monthly : plan.price.annual}
                        </span>
                        <span className="text-muted-foreground text-sm">/month</span>
                        {billingCycle === 'annual' && plan.price.annual > 0 && (
                          <p className="text-xs text-success font-medium mt-1">
                            Billed annually (save ${(plan.price.monthly - plan.price.annual) * 12}/yr)
                          </p>
                        )}
                      </div>
                      <Link to="/signup">
                        <Button className={`w-full mb-6 ${plan.popular ? '' : 'variant-outline'}`} variant={plan.popular ? 'default' : 'outline'}>
                          {plan.cta} <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                      <div className="space-y-3">
                        {plan.features.map((f, j) => (
                          <div key={j} className="flex items-start gap-2 text-sm">
                            <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                            <span>{f}</span>
                          </div>
                        ))}
                        {plan.excluded.map((f, j) => (
                          <div key={j} className="flex items-start gap-2 text-sm text-muted-foreground/50">
                            <X className="h-4 w-4 shrink-0 mt-0.5" />
                            <span className="line-through">{f}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>

            {/* PayPal */}
            <motion.div
              className="mt-8 text-center"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
            >
              <p className="text-sm text-muted-foreground mb-3">Secure payments via</p>
              <div className="flex items-center justify-center gap-6">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <svg viewBox="0 0 24 24" className="h-8 w-auto" fill="currentColor">
                    <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797H9.603a.768.768 0 0 0-.757.646l-1.14 7.24a.642.642 0 0 1-.63.52z"/>
                  </svg>
                  <span className="font-semibold text-sm">PayPal</span>
                </div>
                <div className="h-6 w-px bg-border" />
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Lock className="h-4 w-4" />
                  <span className="text-sm">256-bit SSL Encrypted</span>
                </div>
                <div className="h-6 w-px bg-border" />
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  <span className="text-sm">Cancel Anytime</span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-20 border-t bg-muted/30">
          <div className="container mx-auto px-4 max-w-3xl">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={stagger}
              className="text-center mb-12"
            >
              <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold mb-4">
                Frequently asked questions
              </motion.h2>
            </motion.div>

            <motion.div
              className="space-y-3"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={stagger}
            >
              {[
                {
                  q: 'Will AI send messages without my approval?',
                  a: 'Never. Every single message goes through your approval queue. You can edit, approve, or reject each one. ReviveOS is human-in-the-loop by design — no autopilot, no surprises.',
                },
                {
                  q: 'What if my leads are really old — like 6-12+ months?',
                  a: 'That\'s actually our sweet spot. ReviveOS excels at finding signal in aged leads by analyzing objection history, timing patterns, and intent signals. Many of our best wins come from leads over 6 months old.',
                },
                {
                  q: 'How is this different from a regular email tool?',
                  a: 'Email tools blast everyone the same message. ReviveOS scores each lead individually, uses their specific history (stage, objection, notes) to write personalized messages, and uses proven win-back playbooks. It\'s a revival engine, not a blast tool.',
                },
                {
                  q: 'Can I connect my existing CRM?',
                  a: 'Yes! We support webhook integrations with HubSpot, GoHighLevel, Calendly, and more. You can also import via CSV in under 5 minutes.',
                },
                {
                  q: 'Is there a free plan?',
                  a: 'Yes — our Starter plan is completely free and includes 500 leads, revival scoring, and human approval queue. No credit card required to start.',
                },
                {
                  q: 'What payment methods do you accept?',
                  a: 'We accept PayPal subscriptions for all paid plans. You can subscribe directly through PayPal for secure, recurring billing. Cancel anytime from your PayPal account.',
                },
              ].map((faq, i) => (
                <motion.div key={i} variants={fadeUp}>
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between p-5 bg-card rounded-xl border text-left hover:border-primary/30 transition-colors"
                  >
                    <span className="font-semibold text-sm pr-4">{faq.q}</span>
                    <ChevronDown className={`h-5 w-5 text-muted-foreground shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                  </button>
                  {openFaq === i && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="px-5 pb-4 pt-2 text-sm text-muted-foreground leading-relaxed"
                    >
                      {faq.a}
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24 border-t relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-primary/10 to-primary/5 pointer-events-none" />
          <motion.div
            className="container mx-auto px-4 text-center max-w-3xl relative z-10"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.h2 variants={fadeUp} className="text-3xl md:text-5xl font-extrabold mb-4 leading-tight">
              Every day you wait, revenue slips away
            </motion.h2>
            <motion.p variants={fadeUp} className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
              Your competitors are already re-engaging their dead leads. The question isn't whether to revive your pipeline — it's how much revenue you'll recover when you do.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup">
                <Button size="lg" className="text-base px-10 h-14 shadow-lg shadow-primary/25 text-lg font-bold">
                  Start Recovering Revenue Now <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </motion.div>
            <motion.p variants={fadeUp} className="text-sm text-muted-foreground mt-4">
              Free to start · No credit card · Setup in 5 minutes
            </motion.p>
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="border-t py-12 bg-card">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-4 gap-8 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                    <Zap className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <span className="font-bold text-lg">ReviveOS</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  AI-powered dormant revenue recovery. Turn dead pipeline into booked meetings.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-3">Product</h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <a href="#how-it-works" className="block hover:text-foreground transition-colors">How It Works</a>
                  <a href="#pricing" className="block hover:text-foreground transition-colors">Pricing</a>
                  <a href="#results" className="block hover:text-foreground transition-colors">Results</a>
                  <a href="#faq" className="block hover:text-foreground transition-colors">FAQ</a>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-3">Legal</h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <Link to="/terms" className="block hover:text-foreground transition-colors">Terms of Service</Link>
                  <Link to="/privacy" className="block hover:text-foreground transition-colors">Privacy Policy</Link>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-3">Get Started</h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <Link to="/signup" className="block hover:text-foreground transition-colors">Create Free Account</Link>
                  <Link to="/login" className="block hover:text-foreground transition-colors">Sign In</Link>
                </div>
              </div>
            </div>
            <div className="border-t pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-xs text-muted-foreground">© 2026 ReviveOS. All rights reserved.</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>Payments secured by PayPal</span>
                <span>·</span>
                <span>SOC 2 Compliant</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
