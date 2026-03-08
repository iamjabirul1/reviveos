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
    maxLeads: 1000,
    maxWorkspaces: 1,
    maxCampaigns: 3,
    maxPlaybooks: 3,
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
    maxLeads: 10000,
    maxWorkspaces: 1,
    maxCampaigns: 'unlimited',
    maxPlaybooks: 7,
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
    maxLeads: 25000,
    maxWorkspaces: 3,
    maxCampaigns: 'unlimited',
    maxPlaybooks: 'unlimited',
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

export function getPlanLimits(plan: string): PlanLimits {
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
