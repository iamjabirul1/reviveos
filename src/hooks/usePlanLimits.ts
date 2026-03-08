import { useWorkspace } from '@/contexts/WorkspaceContext';
import { getPlanLimits, getPlanDisplayName, getUpgradePlan, type PlanLimits } from '@/lib/planLimits';

export function usePlanLimits() {
  const { currentWorkspace } = useWorkspace();
  const plan = currentWorkspace?.plan ?? 'free';
  const limits = getPlanLimits(plan);
  const planName = getPlanDisplayName(plan);
  const upgradePlan = getUpgradePlan(plan);

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
