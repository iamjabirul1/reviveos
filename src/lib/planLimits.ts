export interface PlanLimits {
  maxLeads: number;
  maxWorkspaces: number;
  maxCampaigns: number | 'unlimited';
  maxPlaybooks: number | 'unlimited';
  maxAICallsPerDay: number;
  channels: ('email' | 'sms')[];
  customPlaybooks: boolean;
  bulkApprovals: boolean;
  advancedAnalytics: boolean;
  crmSync: boolean;
  autoFollowUps: boolean;
  teamSeats: boolean;
  roleBasedApprovals: boolean;
  reportExports: boolean;
  webhookIntegrations: boolean;
  writeWithAI: boolean;
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: {
    maxLeads: 500,
    maxWorkspaces: 1,
    maxCampaigns: 1,
    maxPlaybooks: 3,
    maxAICallsPerDay: 10,
    channels: ['email'],
    customPlaybooks: false,
    bulkApprovals: false,
    advancedAnalytics: false,
    crmSync: false,
    autoFollowUps: false,
    teamSeats: false,
    roleBasedApprovals: false,
    reportExports: false,
    webhookIntegrations: false,
    writeWithAI: false,
  },
  starter: {
    maxLeads: 5000,
    maxWorkspaces: 1,
    maxCampaigns: 3,
    maxPlaybooks: 3,
    maxAICallsPerDay: 100,
    channels: ['email'],
    customPlaybooks: false,
    bulkApprovals: false,
    advancedAnalytics: false,
    crmSync: false,
    autoFollowUps: false,
    teamSeats: false,
    roleBasedApprovals: false,
    reportExports: false,
    webhookIntegrations: false,
    writeWithAI: false,
  },
  growth: {
    maxLeads: 25000,
    maxWorkspaces: 1,
    maxCampaigns: 'unlimited',
    maxPlaybooks: 7,
    maxAICallsPerDay: 500,
    channels: ['email', 'sms'],
    customPlaybooks: true,
    bulkApprovals: true,
    advancedAnalytics: true,
    crmSync: true,
    autoFollowUps: true,
    teamSeats: false,
    roleBasedApprovals: false,
    reportExports: false,
    webhookIntegrations: true,
    writeWithAI: true,
  },
  scale: {
    maxLeads: 999999,
    maxWorkspaces: 5,
    maxCampaigns: 'unlimited',
    maxPlaybooks: 'unlimited',
    maxAICallsPerDay: 5000,
    channels: ['email', 'sms'],
    customPlaybooks: true,
    bulkApprovals: true,
    advancedAnalytics: true,
    crmSync: true,
    autoFollowUps: true,
    teamSeats: true,
    roleBasedApprovals: true,
    reportExports: true,
    webhookIntegrations: true,
    writeWithAI: true,
  },
};

export const FOUNDER_LIMITS: PlanLimits = {
  maxLeads: 999999,
  maxWorkspaces: 999,
  maxCampaigns: 'unlimited',
  maxPlaybooks: 'unlimited',
  maxAICallsPerDay: 999999,
  channels: ['email', 'sms'],
  customPlaybooks: true,
  bulkApprovals: true,
  advancedAnalytics: true,
  crmSync: true,
  autoFollowUps: true,
  teamSeats: true,
  roleBasedApprovals: true,
  reportExports: true,
  webhookIntegrations: true,
  writeWithAI: true,
};

export const FOUNDER_EMAIL = 'iamjabirul@gmail.com';

export function getPlanLimits(plan: string, email?: string): PlanLimits {
  if (email === FOUNDER_EMAIL) return FOUNDER_LIMITS;
  return PLAN_LIMITS[plan.toLowerCase()] ?? PLAN_LIMITS.free;
}

export function getPlanDisplayName(plan: string): string {
  const names: Record<string, string> = {
    free: 'Free',
    starter: 'Starter',
    growth: 'Growth',
    scale: 'Scale',
  };
  return names[plan.toLowerCase()] ?? 'Free';
}

export function getUpgradePlan(currentPlan: string): string | null {
  const order = ['free', 'starter', 'growth', 'scale'];
  const idx = order.indexOf(currentPlan.toLowerCase());
  if (idx === -1 || idx >= order.length - 1) return null;
  return order[idx + 1];
}
