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
  ArrowUpRight, Play, Quote, Check, X, Gift, Award, Headphones,
  FileText, Rocket, ShieldCheck, Heart,
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
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [paypalClientId, setPaypalClientId] = useState<string | null>(null);
  const [paypalPlans, setPaypalPlans] = useState<any[]>([]);
  const [setupLoading, setSetupLoading] = useState(false);

  useEffect(() => {
    async function fetchConfig() {
      try {
        const { data, error } = await supabase.functions.invoke('paypal-config');
        if (!error && data) {
          setPaypalClientId(data.clientId);
          setPaypalPlans(data.plans || []);
        }
      } catch (err) {
        console.error('Failed to load PayPal config:', err);
      }
    }
    fetchConfig();
  }, []);

  const handleSetupPlans = async () => {
    setSetupLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in first to setup PayPal plans');
        navigate('/login');
        return;
      }
      const { data, error } = await supabase.functions.invoke('paypal-setup');
      if (error) throw error;
      toast.success('PayPal plans created successfully!');
      // Refresh config
      const { data: config } = await supabase.functions.invoke('paypal-config');
      if (config) {
        setPaypalClientId(config.clientId);
        setPaypalPlans(config.plans || []);
      }
    } catch (err) {
      console.error('Setup error:', err);
      toast.error('Failed to create PayPal plans. Check console for details.');
    } finally {
      setSetupLoading(false);
    }
  };

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
          🚀 ReviveOS is now in Early Access — be first to recover your dead pipeline with AI.{' '}
          <Link to="/signup" className="underline font-bold">Get started free →</Link>
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
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs px-3 py-1 gap-1.5">
                  <Rocket className="h-3 w-3 text-primary" />
                  Now in Early Access
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Join the sales teams already recovering dead pipeline with AI
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

        {/* Speed-to-Lead Stats — Expert-cited data */}
        <section className="py-20 border-t">
          <div className="container mx-auto px-4 max-w-5xl">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={stagger}
              className="text-center mb-12"
            >
              <motion.div variants={fadeUp}>
                <Badge variant="outline" className="mb-4 gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  Speed to Lead
                </Badge>
              </motion.div>
              <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold mb-4">
                Every minute you wait, you lose money
              </motion.h2>
              <motion.p variants={fadeUp} className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Industry research consistently shows that response speed is the #1 predictor of lead conversion. Here's what the data says:
              </motion.p>
            </motion.div>

            <motion.div
              className="grid md:grid-cols-4 gap-5 mb-14"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={stagger}
            >
              {[
                { stat: '391%', desc: 'higher close rate when you respond within 60 seconds', source: 'Lead Connect Study', color: 'text-primary' },
                { stat: '21×', desc: 'more likely to enter the sales process with a 5-min response vs. 30 min', source: 'InsideSales.com / MIT', color: 'text-primary' },
                { stat: '80%', desc: 'drop in lead qualification chances after just 5 minutes of delay', source: 'Harvard Business Review', color: 'text-destructive' },
                { stat: '78%', desc: 'of customers buy from the first company that responds to them', source: 'Lead Connect Study', color: 'text-primary' },
              ].map((item, i) => (
                <motion.div key={i} variants={scaleIn}>
                  <Card className="h-full text-center hover:shadow-lg transition-shadow border-2 hover:border-primary/20">
                    <CardContent className="pt-8 pb-6 px-5">
                      <p className={`text-4xl md:text-5xl font-black mb-3 ${item.color}`}>{item.stat}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-3">{item.desc}</p>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">{item.source}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>

            {/* Expert quotes */}
            <motion.div
              className="grid md:grid-cols-2 gap-6"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={stagger}
            >
              <motion.div variants={fadeUp}>
                <Card className="h-full bg-primary/5 border-primary/10">
                  <CardContent className="pt-6 pb-5 px-6">
                    <Quote className="h-8 w-8 text-primary/30 mb-3" />
                    <p className="text-sm leading-relaxed mb-4 italic text-foreground">
                      "The fortune is in the follow-up. Most businesses leave 80% of their revenue on the table by not re-engaging leads who said 'not right now.' Speed and persistence are the two biggest levers."
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">AH</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Alex Hormozi</p>
                        <p className="text-xs text-muted-foreground">Founder, Acquisition.com — $200M+ portfolio</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={fadeUp}>
                <Card className="h-full bg-primary/5 border-primary/10">
                  <CardContent className="pt-6 pb-5 px-6">
                    <Quote className="h-8 w-8 text-primary/30 mb-3" />
                    <p className="text-sm leading-relaxed mb-4 italic text-foreground">
                      "35-50% of sales go to the vendor that responds first. Yet the average B2B lead response time is 42 hours. This gap is where millions in revenue are lost every year."
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">DR</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Dr. James Oldroyd</p>
                        <p className="text-xs text-muted-foreground">MIT Lead Response Study — cited by Harvard Business Review</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>

            {/* Brand logos bar */}
            <motion.div
              className="mt-14 text-center"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeUp}
            >
              <p className="text-xs uppercase tracking-widest text-muted-foreground/50 font-medium mb-6">
                Research cited by leading organizations
              </p>
              <div className="flex flex-wrap items-center justify-center gap-8 text-muted-foreground/40">
                {['Harvard Business Review', 'MIT', 'Salesforce', 'HubSpot', 'Gartner'].map((name) => (
                  <span key={name} className="text-sm font-semibold tracking-wide">{name}</span>
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

        {/* What ReviveOS Can Do */}
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
                Built for pipeline recovery
              </motion.h2>
              <motion.p variants={fadeUp} className="text-muted-foreground text-lg">
                Everything you need to turn stale leads into booked meetings
              </motion.p>
            </motion.div>

            {/* Capabilities */}
            <motion.div
              className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={stagger}
            >
              {[
                { value: 'AI Scoring', label: 'Instantly rank every lead by revival potential', icon: TrendingUp },
                { value: 'Personalized', label: 'Hyper-personalized win-back messages at scale', icon: MessageSquare },
                { value: 'Multi-Channel', label: 'Email and SMS outreach with tracking', icon: Mail },
                { value: '< 15 min', label: 'Time to launch your first campaign', icon: Clock },
              ].map((s, i) => (
                <motion.div key={i} variants={scaleIn} className="text-center p-6 bg-card rounded-xl border">
                  <s.icon className="h-6 w-6 text-primary mx-auto mb-3" />
                  <p className="text-2xl md:text-3xl font-extrabold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-2 leading-snug">{s.label}</p>
                </motion.div>
              ))}
            </motion.div>

            {/* Use cases instead of fake testimonials */}
            <motion.div
              className="grid md:grid-cols-3 gap-6"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={stagger}
            >
              {[
                {
                  title: "Lost Deal Revival",
                  description: "Re-engage closed-lost opportunities with personalized messaging based on the original deal context and timing signals.",
                  icon: Target,
                },
                {
                  title: "No-Show Recovery",
                  description: "Automatically follow up with prospects who ghosted demos, using AI-crafted messages that acknowledge the gap without being pushy.",
                  icon: CalendarCheck,
                },
                {
                  title: "Stale Pipeline Cleanup",
                  description: "Import thousands of dormant leads, let AI score and segment them, then launch targeted campaigns — all with human approval.",
                  icon: Sparkles,
                },
              ].map((uc, i) => (
                <motion.div key={i} variants={fadeUp}>
                  <Card className="h-full">
                    <CardContent className="pt-6 pb-5 px-6">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                        <uc.icon className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className="text-base font-semibold mb-2">{uc.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{uc.description}</p>
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
        {paypalClientId ? (
        <PayPalPricingProvider clientId={paypalClientId}>
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
                Simple pricing for recovering revenue from old leads
              </motion.h2>
              <motion.p variants={fadeUp} className="text-muted-foreground text-lg mb-8">
                Choose the plan that fits your lead volume today. Start small, recover lost opportunities fast, and upgrade only when you need more channels, more campaigns, or more client accounts.
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
                  desc: 'For lean sales teams ready to turn their dormant pipeline into booked meetings.',
                  price: { monthly: 299, annual: 239 },
                  cta: 'Start Reviving',
                  popular: false,
                  features: [
                    '5,000 leads stored',
                    'CSV upload import',
                    'AI stale-lead scoring',
                    'Email verification firewall',
                    'Email campaign generation',
                    '3 built-in playbooks',
                    'Human approval inbox with hotkeys',
                    'Booking link insertion',
                    'Analytics dashboard',
                    'Email support',
                  ],
                  excluded: ['SMS channel', 'Custom playbooks', 'CRM sync'],
                  bonus: 'Revival Script Pack + Setup Consultation',
                  guarantee: 'Get your first campaign live in 48 hours or we\'ll set it up for you.',
                },
                {
                  name: 'Growth',
                  desc: 'For revenue teams who want consistent weekly meetings from dormant pipeline.',
                  price: { monthly: 599, annual: 479 },
                  cta: 'Get Growth',
                  popular: true,
                  features: [
                    'Everything in Starter',
                    '25,000 leads stored',
                    'CRM sync (HubSpot, GHL)',
                    'Email + SMS reactivation',
                    'Unlimited campaigns',
                    '7 built-in playbooks',
                    'Smart lead buckets',
                    'AI message personalization',
                    'Bulk approvals',
                    'Advanced analytics',
                    'Auto follow-up sequences',
                    'Priority support',
                  ],
                  excluded: [],
                  bonus: 'No-Show Rescue + Closed-Lost Comeback Playbooks',
                  guarantee: 'Launch your first recovery engine in 7 days or we help set it up.',
                },
                {
                  name: 'Scale',
                  desc: 'For agencies and operators managing multiple brands or high-volume revival.',
                  price: { monthly: 1200, annual: 960 },
                  cta: 'Go Scale',
                  popular: false,
                  features: [
                    'Everything in Growth',
                    'Unlimited leads',
                    '5 workspaces / client accounts',
                    'Multi-client dashboard',
                    'Custom playbook builder',
                    'Team seats & role-based approvals',
                    'Client-ready reporting exports',
                    'Webhook / Zapier-ready integrations',
                    'Priority processing',
                    'Dedicated onboarding',
                  ],
                  excluded: [],
                  bonus: 'Agency Reporting Kit + Multi-Client SOP + Dedicated CSM',
                  guarantee: 'We help you get your first client or workspace live within 72 hours.',
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
                      {paypalClientId && paypalPlans.length > 0 ? (
                        <div className="mb-6">
                          <PayPalSubscribeButton
                            planName={plan.name}
                            billingCycle={billingCycle}
                            plans={paypalPlans}
                            onSetupRequired={handleSetupPlans}
                          />
                        </div>
                      ) : (
                        <Link to="/signup">
                          <Button className={`w-full mb-6`} variant={plan.popular ? 'default' : 'outline'}>
                            {plan.cta} <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                      )}
                      <div className="space-y-3 mb-5">
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
                      <div className="border-t pt-4 mt-4 space-y-3">
                        <div className="flex items-start gap-2 text-sm">
                          <Gift className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                          <span><strong>Bonus:</strong> {plan.bonus}</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                          <ShieldCheck className="h-4 w-4 text-success shrink-0 mt-0.5" />
                          <span className="text-muted-foreground text-xs">{plan.guarantee}</span>
                        </div>
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
        </PayPalPricingProvider>
        ) : (
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
                Loading pricing...
              </motion.p>
            </motion.div>
          </div>
        </section>
        )}

        {/* Bonuses Stack */}
        <section className="py-20 border-t bg-muted/30">
          <div className="container mx-auto px-4 max-w-5xl">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={stagger}
              className="text-center mb-12"
            >
              <motion.div variants={fadeUp}>
                <Badge variant="outline" className="mb-4 gap-2"><Gift className="h-3.5 w-3.5" /> Included Bonuses</Badge>
              </motion.div>
              <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold mb-4">
                Every plan comes loaded with bonuses
              </motion.h2>
              <motion.p variants={fadeUp} className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Scripts, templates, and playbooks that accelerate your results from day one.
              </motion.p>
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
                  tier: 'Starter Bonuses',
                  tagline: 'Get the exact scripts and setup flow we use to wake up cold leads fast.',
                  items: [
                    'Dead Lead Revival Script Pack',
                    '3 High-Converting Reactivation Templates',
                    '7-Minute Setup Checklist',
                  ],
                },
                {
                  tier: 'Growth Bonuses',
                  tagline: 'Use the same recovery plays high-performing sales teams use to recover missed deals.',
                  items: [
                    'Everything in Starter bonuses',
                    'No-Show Rescue Playbook',
                    'Closed-Lost Comeback Playbook',
                    'SMS Reactivation Swipe File',
                  ],
                },
                {
                  tier: 'Scale Bonuses',
                  tagline: 'Everything you need to deliver ReviveOS as a client-facing revenue service.',
                  items: [
                    'Everything in Growth bonuses',
                    'Agency Client Reporting Template',
                    'Custom Offer Angle Builder',
                    'Multi-Client Revival SOP',
                  ],
                },
              ].map((bonus, i) => (
                <motion.div key={i} variants={fadeUp}>
                  <Card className="h-full">
                    <CardContent className="pt-6 pb-6 px-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Gift className="h-5 w-5 text-warning" />
                        <h3 className="font-bold">{bonus.tier}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4 italic">"{bonus.tagline}"</p>
                      <div className="space-y-2.5">
                        {bonus.items.map((item, j) => (
                          <div key={j} className="flex items-start gap-2 text-sm">
                            <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-20 border-t">
          <div className="container mx-auto px-4 max-w-5xl">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={stagger}
              className="text-center mb-12"
            >
              <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold mb-4">
                Why teams choose ReviveOS
              </motion.h2>
              <motion.p variants={fadeUp} className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Turn old leads into booked calls without doing manual follow-up.
              </motion.p>
            </motion.div>

            <motion.div
              className="grid md:grid-cols-2 gap-x-12 gap-y-6 max-w-3xl mx-auto"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={stagger}
            >
              {[
                'Upload your old leads and get your best revival opportunities instantly.',
                'No CRM cleanup marathon required.',
                'Perfect if you just need booked calls from dormant leads.',
                'Built for businesses that want recovery on autopilot.',
                'More channels, more campaigns, more meetings.',
                'The best plan for turning dead leads into steady revenue.',
                'Perfect for agencies and operators running revival for others.',
                'More control, more accounts, more leverage.',
              ].map((benefit, i) => (
                <motion.div key={i} variants={fadeUp} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="h-3.5 w-3.5 text-success" />
                  </div>
                  <p className="text-sm leading-relaxed">{benefit}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Guarantees & Risk Reversal */}
        <section className="py-20 border-t bg-muted/30">
          <div className="container mx-auto px-4 max-w-4xl">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={stagger}
              className="text-center mb-12"
            >
              <motion.div variants={fadeUp}>
                <Badge variant="outline" className="mb-4 gap-2"><ShieldCheck className="h-3.5 w-3.5" /> Zero Risk</Badge>
              </motion.div>
              <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold mb-4">
                Our guarantees to you
              </motion.h2>
              <motion.p variants={fadeUp} className="text-muted-foreground text-lg max-w-2xl mx-auto">
                We're confident ReviveOS will deliver results. Here's how we back that up.
              </motion.p>
            </motion.div>

            <motion.div
              className="grid md:grid-cols-3 gap-6 mb-12"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={stagger}
            >
              {[
                {
                  icon: Rocket,
                  title: '7-Day Free Trial',
                  desc: 'Try ReviveOS free for 7 days. Import your leads, generate campaigns, and see your first revival opportunities before paying.',
                },
                {
                  icon: Heart,
                  title: '14-Day Money-Back Guarantee',
                  desc: 'If you upload your leads, launch at least one campaign, and feel ReviveOS is not useful, email us within 14 days and we\'ll refund you.',
                },
                {
                  icon: Headphones,
                  title: 'First-Win Guarantee',
                  desc: 'Launch your first reactivation campaign in 7 days or we\'ll help you set it up personally at no extra cost.',
                },
              ].map((g, i) => (
                <motion.div key={i} variants={fadeUp}>
                  <Card className="h-full border-success/20 bg-success/3">
                    <CardContent className="pt-6 pb-6 px-6 text-center">
                      <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center mx-auto mb-4">
                        <g.icon className="h-6 w-6 text-success" />
                      </div>
                      <h3 className="font-bold mb-2">{g.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{g.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>

            {/* Main Guarantee Banner */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={stagger}
            >
              <motion.div variants={fadeUp}>
                <Card className="border-primary/20 bg-primary/5 overflow-hidden">
                  <CardContent className="py-8 px-8 md:px-12">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Award className="h-8 w-8 text-primary" />
                      </div>
                      <div className="text-center md:text-left">
                        <h3 className="text-xl font-bold mb-2">The Pipeline Revival Guarantee</h3>
                        <p className="text-muted-foreground leading-relaxed">
                          Import your stale leads, launch a campaign, and get clear revival opportunities fast — or we'll help you build your first working playbook for free.
                        </p>
                      </div>
                    </div>
                    <div className="mt-6 pt-6 border-t border-primary/10 grid md:grid-cols-2 gap-4">
                      <div className="flex items-start gap-3">
                        <Headphones className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold">24-Hour Setup Help Guarantee</p>
                          <p className="text-xs text-muted-foreground">If you get stuck during setup, we'll respond within 24 hours and help you get your first campaign live.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <FileText className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold">Recovery Launch Guarantee <Badge variant="secondary" className="ml-1 text-[10px]">Growth & Scale</Badge></p>
                          <p className="text-xs text-muted-foreground">If you activate your account and launch your first campaign but still feel lost, we'll review your first playbook and rewrite it for you.</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </div>
        </section>

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
