import { Database } from '@/integrations/supabase/types';

type Lead = Database['public']['Tables']['leads']['Row'];

interface ScoreResult {
  score: number;
  bucket: 'revive_now' | 'review_first' | 'nurture_later' | 'suppress';
  best_angle: string;
  best_channel: string;
  risk_flag: string | null;
  suggested_cta: string;
}

export function scoreLead(lead: Partial<Lead>, emailVerification?: { status: string }): ScoreResult {
  let score = 50; // base
  const reasons: string[] = [];

  // Suppress checks
  if (lead.do_not_contact) {
    return { score: 0, bucket: 'suppress', best_angle: 'N/A', best_channel: 'N/A', risk_flag: 'Do not contact', suggested_cta: 'N/A' };
  }
  if (!lead.email && !lead.phone) {
    return { score: 0, bucket: 'suppress', best_angle: 'N/A', best_channel: 'N/A', risk_flag: 'Missing contact info', suggested_cta: 'N/A' };
  }

  // Deliverability firewall — invalid or spam_trap emails get immediately suppressed
  if (emailVerification) {
    const status = emailVerification.status.toLowerCase();
    if (status === 'invalid' || status === 'spam_trap' || status === 'abuse' || status === 'disposable') {
      return { score: 0, bucket: 'suppress', best_angle: 'N/A', best_channel: 'N/A', risk_flag: `Email ${status}`, suggested_cta: 'N/A' };
    }
  }

  // No-show in last 30 days
  if (lead.no_show_flag && lead.last_activity_at) {
    const daysSince = daysBetween(new Date(lead.last_activity_at), new Date());
    if (daysSince <= 30) {
      score += 25;
      reasons.push('Recent no-show — high intent signal');
    }
  }

  // Closed-lost with timing reason
  if (lead.closed_lost_reason) {
    const lower = lead.closed_lost_reason.toLowerCase();
    if (lower.includes('timing') || lower.includes('not now') || lower.includes('later') || lower.includes('budget')) {
      score += 20;
      reasons.push('Timing-based objection — worth revisiting');
    }
  }

  // Last contact 14-120 days ago
  if (lead.last_contacted_at) {
    const days = daysBetween(new Date(lead.last_contacted_at), new Date());
    if (days >= 14 && days <= 120) {
      score += 15;
      reasons.push('In the sweet spot window (14-120 days)');
    } else if (days > 120) {
      score -= 5;
    }
  }

  // Lead value above threshold
  if (lead.lead_value && lead.lead_value > 1000) {
    score += 15;
    reasons.push('High-value opportunity');
  }

  // Old but never contacted
  if (!lead.last_contacted_at && lead.created_at) {
    const days = daysBetween(new Date(lead.created_at), new Date());
    if (days > 90) {
      score -= 15;
      reasons.push('Old lead, never contacted');
    }
  }

  // Notes present (prior engagement)
  if (lead.notes && lead.notes.length > 10) {
    score += 10;
    reasons.push('Prior engagement notes available');
  }

  // Clamp
  score = Math.max(0, Math.min(100, score));

  // Determine bucket
  let bucket: ScoreResult['bucket'];
  if (score >= 75) bucket = 'revive_now';
  else if (score >= 50) bucket = 'review_first';
  else if (score >= 25) bucket = 'nurture_later';
  else bucket = 'suppress';

  // Best angle
  const best_angle = reasons.length > 0 ? reasons[0] : 'General re-engagement opportunity';

  // Best channel
  const best_channel = lead.email ? 'email' : 'sms';

  // Risk flag
  let risk_flag: string | null = null;
  if (lead.consent_status === 'opted_out') risk_flag = 'Previously opted out';
  if (score < 25) risk_flag = 'Low revival probability';

  // Suggested CTA
  let suggested_cta = 'book_call';
  if (lead.no_show_flag) suggested_cta = 'reply';
  else if (lead.closed_lost_reason) suggested_cta = 'claim_offer';
  else if ((lead.lead_value ?? 0) > 5000) suggested_cta = 'book_call';

  return { score, bucket, best_angle, best_channel, risk_flag, suggested_cta };
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor(Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}
