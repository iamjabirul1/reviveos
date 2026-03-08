import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lock, ArrowUpRight } from 'lucide-react';
import { getPlanDisplayName } from '@/lib/planLimits';

interface UpgradePromptProps {
  feature: string;
  currentPlan: string;
  requiredPlan: string;
  inline?: boolean;
}

export function UpgradePrompt({ feature, currentPlan, requiredPlan, inline }: UpgradePromptProps) {
  const requiredName = getPlanDisplayName(requiredPlan);
  const currentName = getPlanDisplayName(currentPlan);

  if (inline) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Lock className="h-3.5 w-3.5" />
        <span>{feature} requires <strong>{requiredName}</strong> plan.</span>
        <Link to="/#pricing">
          <Button variant="link" size="sm" className="h-auto p-0 text-primary">
            Upgrade <ArrowUpRight className="ml-1 h-3 w-3" />
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="flex items-center justify-between py-4 px-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">{feature}</p>
            <p className="text-xs text-muted-foreground">
              Available on <Badge variant="secondary" className="ml-1">{requiredName}</Badge> and above. You're on <Badge variant="outline">{currentName}</Badge>.
            </p>
          </div>
        </div>
        <Link to="/#pricing">
          <Button size="sm">
            Upgrade to {requiredName} <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

interface LimitReachedProps {
  resource: string;
  current: number;
  max: number | 'unlimited';
  upgradePlan: string | null;
}

export function LimitReached({ resource, current, max, upgradePlan }: LimitReachedProps) {
  if (max === 'unlimited') return null;

  return (
    <Card className="border-warning/30 bg-warning/5">
      <CardContent className="flex items-center justify-between py-4 px-6">
        <div>
          <p className="font-semibold text-sm">
            {resource} limit reached ({current.toLocaleString()}/{max.toLocaleString()})
          </p>
          <p className="text-xs text-muted-foreground">
            {upgradePlan
              ? `Upgrade to ${getPlanDisplayName(upgradePlan)} for more ${resource.toLowerCase()}.`
              : 'You are on the highest plan.'}
          </p>
        </div>
        {upgradePlan && (
          <Link to="/#pricing">
            <Button size="sm" variant="outline">
              Upgrade <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
