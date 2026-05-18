import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Lock, Sparkles, ArrowRight, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PaywallOverlayProps {
  recoverableRevenue: number;
  avgDealSize: number;
  leadCount: number;
}

export default function PaywallOverlay({ recoverableRevenue, avgDealSize, leadCount }: PaywallOverlayProps) {
  const dealsToBreakEven = Math.max(1, Math.ceil((599 * 12) / avgDealSize));
  const recoveryRate = ((599 / recoverableRevenue) * 100).toFixed(2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.2 }}
      className="relative rounded-2xl border-2 border-primary bg-card overflow-hidden"
    >
      {/* Gradient accent */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-success to-primary" />

      <div className="p-8 md:p-10 text-center space-y-6">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-semibold">
          <Lock className="h-4 w-4" /> Unlock Your Full Pipeline
        </div>

        <h2 className="text-3xl font-bold text-foreground">
          Your recoverable revenue is <span className="text-success">${recoverableRevenue.toLocaleString()}</span>
        </h2>

        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          ReviveOS has {leadCount.toLocaleString()} leads queued in your "Revive Now" bucket with personalized
          AI-generated win-back campaigns ready to send.
        </p>

        {/* ROI math */}
        <div className="bg-muted/50 rounded-xl p-6 max-w-lg mx-auto text-left space-y-3">
          <h3 className="font-semibold text-foreground">The Math:</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Growth Plan</span>
              <span className="font-medium text-foreground">$599/mo</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Your avg deal size</span>
              <span className="font-medium text-foreground">${avgDealSize.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Deals to break even (annual)</span>
              <span className="font-medium text-foreground">{dealsToBreakEven} deals</span>
            </div>
            <div className="h-px bg-border" />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Required recovery rate</span>
              <span className="font-bold text-success">{recoveryRate}%</span>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
          {['AI message generation', 'Multi-step sequences', 'Email delivery', 'Analytics dashboard'].map((f) => (
            <span key={f} className="flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-success" /> {f}
            </span>
          ))}
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/checkout?plan=growth">
            <Button size="lg" className="h-14 text-lg px-8 shadow-lg">
              <Sparkles className="h-5 w-5 mr-2" /> Unlock My Pipeline — $599/mo
            </Button>
          </Link>
          <Link to="/checkout?plan=starter">
            <Button variant="outline" size="lg" className="h-14 px-8">
              Start with Starter — $299/mo <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>

        <p className="text-xs text-muted-foreground">
          Cancel anytime. No contracts. Your pipeline data stays private.
        </p>
      </div>
    </motion.div>
  );
}
