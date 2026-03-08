import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Bell, Loader2 } from 'lucide-react';

interface Prefs {
  plan_limit_warnings: boolean;
  subscription_updates: boolean;
  weekly_usage_digest: boolean;
}

const DEFAULT_PREFS: Prefs = {
  plan_limit_warnings: true,
  subscription_updates: true,
  weekly_usage_digest: true,
};

export default function NotificationPreferences() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentWorkspace && user) fetchPrefs();
  }, [currentWorkspace, user]);

  async function fetchPrefs() {
    if (!currentWorkspace || !user) return;
    setLoading(true);
    const { data } = await supabase
      .from('notification_preferences')
      .select('plan_limit_warnings, subscription_updates, weekly_usage_digest')
      .eq('user_id', user.id)
      .eq('workspace_id', currentWorkspace.id)
      .maybeSingle();

    if (data) {
      setPrefs({
        plan_limit_warnings: data.plan_limit_warnings,
        subscription_updates: data.subscription_updates,
        weekly_usage_digest: data.weekly_usage_digest,
      });
    }
    setLoading(false);
  }

  async function updatePref(key: keyof Prefs, value: boolean) {
    if (!currentWorkspace || !user) return;
    const newPrefs = { ...prefs, [key]: value };
    setPrefs(newPrefs);
    setSaving(true);

    const { error } = await supabase
      .from('notification_preferences')
      .upsert(
        {
          user_id: user.id,
          workspace_id: currentWorkspace.id,
          ...newPrefs,
        },
        { onConflict: 'user_id,workspace_id' }
      );

    if (error) {
      toast({ title: 'Error', description: 'Failed to save preference', variant: 'destructive' });
      setPrefs(prefs); // revert
    } else {
      toast({ title: 'Preference saved' });
    }
    setSaving(false);
  }

  const items = [
    {
      key: 'plan_limit_warnings' as const,
      label: 'Plan limit warnings',
      description: 'Get notified when you\'re approaching your plan limits (80%+ usage)',
    },
    {
      key: 'subscription_updates' as const,
      label: 'Subscription updates',
      description: 'Receive emails when your subscription status changes',
    },
    {
      key: 'weekly_usage_digest' as const,
      label: 'Weekly usage digest',
      description: 'Receive a weekly summary of your workspace usage and AI calls',
    },
  ];

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
        <CardDescription>Choose which email notifications you'd like to receive</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {items.map((item) => (
          <div key={item.key} className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">{item.label}</Label>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
            <Switch
              checked={prefs[item.key]}
              onCheckedChange={(val) => updatePref(item.key, val)}
              disabled={saving}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
