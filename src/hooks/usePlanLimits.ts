import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { getPlanLimits, getPlanDisplayName, getUpgradePlan, FOUNDER_EMAIL, type PlanLimits } from '@/lib/planLimits';

export function usePlanLimits() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const plan = currentWorkspace?.plan ?? 'free';
  const isFounder = user?.email === FOUNDER_EMAIL;
  const limits = getPlanLimits(plan, user?.email ?? undefined);
  const planName = isFounder ? 'Founder' : getPlanDisplayName(plan);
  const upgradePlan = isFounder ? null : getUpgradePlan(plan);

  const canAddLeads = (currentCount: number) => currentCount < limits.maxLeads;
  const canAddCampaign = (currentCount: number) =>
    limits.maxCampaigns === 'unlimited' || currentCount < limits.maxCampaigns;
  const canAddPlaybook = (currentCount: number) =>
    limits.maxPlaybooks === 'unlimited' || currentCount < limits.maxPlaybooks;
  const canUseChannel = (channel: 'email' | 'sms') => limits.channels.includes(channel);

  return {
    plan,
    planName,
    limits,
    upgradePlan,
    canAddLeads,
    canAddCampaign,
    canAddPlaybook,
    canUseChannel,
  };
}
