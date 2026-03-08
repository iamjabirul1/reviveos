import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Phone, Mail, MessageSquare, Loader2, Save, Trash2, CheckCircle2, XCircle,
  Link as LinkIcon,
} from 'lucide-react';

interface IntegrationConfig {
  provider: string;
  label: string;
  icon: React.ElementType;
  description: string;
  fields: { key: string; label: string; placeholder: string; type?: string }[];
}

const INTEGRATIONS: IntegrationConfig[] = [
  {
    provider: 'twilio',
    label: 'Twilio (SMS)',
    icon: Phone,
    description: 'Send SMS messages via your Twilio account',
    fields: [
      { key: 'account_sid', label: 'Account SID', placeholder: 'ACxxxxxxxxxx' },
      { key: 'auth_token', label: 'Auth Token', placeholder: 'Your auth token', type: 'password' },
      { key: 'phone_number', label: 'From Phone Number', placeholder: '+1234567890' },
    ],
  },
  {
    provider: 'whatsapp',
    label: 'WhatsApp (via Twilio)',
    icon: MessageSquare,
    description: 'Send WhatsApp messages via Twilio WhatsApp Business API',
    fields: [
      { key: 'account_sid', label: 'Account SID', placeholder: 'ACxxxxxxxxxx (same as Twilio)' },
      { key: 'auth_token', label: 'Auth Token', placeholder: 'Your auth token', type: 'password' },
      { key: 'whatsapp_number', label: 'WhatsApp Number', placeholder: '+14155238886' },
    ],
  },
  {
    provider: 'resend',
    label: 'Resend (Email)',
    icon: Mail,
    description: 'Send emails via your own Resend account',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 're_xxxxxxxxxx', type: 'password' },
      { key: 'from_email', label: 'From Email', placeholder: 'you@yourdomain.com' },
      { key: 'from_name', label: 'From Name', placeholder: 'Your Company' },
    ],
  },
  {
    provider: 'hubspot',
    label: 'HubSpot',
    icon: LinkIcon,
    description: 'Sync contacts and deals with HubSpot CRM',
    fields: [
      { key: 'api_key', label: 'Private App Token', placeholder: 'pat-xx-xxxxxxxx', type: 'password' },
      { key: 'portal_id', label: 'Portal ID (optional)', placeholder: '12345678' },
    ],
  },
  {
    provider: 'gohighlevel',
    label: 'GoHighLevel',
    icon: LinkIcon,
    description: 'Sync contacts and opportunities with GoHighLevel',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'Your GHL API key', type: 'password' },
      { key: 'location_id', label: 'Location ID', placeholder: 'loc_xxxxxxxxxx' },
    ],
  },
  {
    provider: 'shopify',
    label: 'Shopify',
    icon: LinkIcon,
    description: 'Sync customers and orders from your Shopify store',
    fields: [
      { key: 'access_token', label: 'Admin API Access Token', placeholder: 'shpat_xxxxxxxxxx', type: 'password' },
      { key: 'store_domain', label: 'Store Domain', placeholder: 'yourstore.myshopify.com' },
    ],
  },
];

interface SavedIntegration {
  id: string;
  provider: string;
  credentials: Record<string, string>;
  is_active: boolean;
}

export default function IntegrationSettings() {
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  const [saved, setSaved] = useState<Record<string, SavedIntegration>>({});
  const [forms, setForms] = useState<Record<string, Record<string, string>>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentWorkspace) fetchIntegrations();
  }, [currentWorkspace]);

  async function fetchIntegrations() {
    if (!currentWorkspace) return;
    const { data, error } = await supabase
      .from('workspace_integrations' as any)
      .select('*')
      .eq('workspace_id', currentWorkspace.id);

    if (!error && data) {
      const map: Record<string, SavedIntegration> = {};
      const formMap: Record<string, Record<string, string>> = {};
      for (const row of data as any[]) {
        map[row.provider] = row;
        // Mask sensitive fields
        const creds = row.credentials as Record<string, string>;
        const masked: Record<string, string> = {};
        for (const [k, v] of Object.entries(creds)) {
          masked[k] = v ? '••••••••' : '';
        }
        formMap[row.provider] = masked;
      }
      setSaved(map);
      setForms((prev) => ({ ...prev, ...formMap }));
    }
    setLoading(false);
  }

  function updateField(provider: string, key: string, value: string) {
    setForms((prev) => ({
      ...prev,
      [provider]: { ...(prev[provider] || {}), [key]: value },
    }));
  }

  async function saveIntegration(provider: string) {
    if (!currentWorkspace) return;
    setSaving(provider);

    const config = INTEGRATIONS.find((i) => i.provider === provider);
    if (!config) return;

    // Build credentials, keeping existing values for masked fields
    const formValues = forms[provider] || {};
    const existingCreds = saved[provider]?.credentials || {};
    const credentials: Record<string, string> = {};
    for (const field of config.fields) {
      const val = formValues[field.key];
      if (val && val !== '••••••••') {
        credentials[field.key] = val;
      } else if (existingCreds[field.key]) {
        credentials[field.key] = existingCreds[field.key];
      }
    }

    // Check all required fields have values
    const missing = config.fields.filter((f) => !credentials[f.key]);
    if (missing.length > 0) {
      toast({
        title: 'Missing fields',
        description: `Please fill in: ${missing.map((f) => f.label).join(', ')}`,
        variant: 'destructive',
      });
      setSaving(null);
      return;
    }

    try {
      if (saved[provider]) {
        await supabase
          .from('workspace_integrations' as any)
          .update({ credentials, is_active: true })
          .eq('id', saved[provider].id);
      } else {
        await supabase
          .from('workspace_integrations' as any)
          .insert({
            workspace_id: currentWorkspace.id,
            provider,
            credentials,
            is_active: true,
          });
      }
      toast({ title: `${config.label} saved`, description: 'Integration credentials updated successfully.' });
      fetchIntegrations();
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to save integration.', variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  }

  async function toggleIntegration(provider: string, active: boolean) {
    if (!saved[provider]) return;
    await supabase
      .from('workspace_integrations' as any)
      .update({ is_active: active })
      .eq('id', saved[provider].id);
    toast({ title: active ? 'Integration enabled' : 'Integration disabled' });
    fetchIntegrations();
  }

  async function deleteIntegration(provider: string) {
    if (!saved[provider]) return;
    const config = INTEGRATIONS.find((i) => i.provider === provider);
    await supabase
      .from('workspace_integrations' as any)
      .delete()
      .eq('id', saved[provider].id);
    toast({ title: `${config?.label ?? provider} disconnected` });
    setForms((prev) => {
      const next = { ...prev };
      delete next[provider];
      return next;
    });
    fetchIntegrations();
  }

  async function testIntegration(provider: string) {
    if (!currentWorkspace) return;
    setTesting(provider);
    try {
      const { data, error } = await supabase.functions.invoke('test-integration', {
        body: { workspace_id: currentWorkspace.id, provider },
      });

      if (error) throw error;

      if (data?.success) {
        toast({ title: 'Connection successful', description: `${provider} is working correctly.` });
      } else {
        toast({
          title: 'Connection failed',
          description: data?.error || 'Could not connect. Please check your credentials.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Test failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setTesting(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {INTEGRATIONS.map((config) => {
        const integration = saved[config.provider];
        const isConnected = integration?.is_active;
        const Icon = config.icon;

        return (
          <Card key={config.provider}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {config.label}
                      {isConnected ? (
                        <Badge variant="default" className="text-xs gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Connected
                        </Badge>
                      ) : integration ? (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <XCircle className="h-3 w-3" /> Disabled
                        </Badge>
                      ) : null}
                    </CardTitle>
                    <CardDescription className="text-xs">{config.description}</CardDescription>
                  </div>
                </div>
                {integration && (
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={integration.is_active}
                      onCheckedChange={(checked) => toggleIntegration(config.provider, checked)}
                    />
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                {config.fields.map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <Label className="text-xs">{field.label}</Label>
                    <Input
                      type={field.type || 'text'}
                      placeholder={field.placeholder}
                      value={forms[config.provider]?.[field.key] || ''}
                      onChange={(e) => updateField(config.provider, field.key, e.target.value)}
                      onFocus={() => {
                        // Clear mask on focus
                        if (forms[config.provider]?.[field.key] === '••••••••') {
                          updateField(config.provider, field.key, '');
                        }
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={() => saveIntegration(config.provider)}
                  disabled={saving === config.provider}
                >
                  {saving === config.provider ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  {integration ? 'Update' : 'Connect'}
                </Button>
                {integration && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => testIntegration(config.provider)}
                      disabled={testing === config.provider}
                    >
                      {testing === config.provider ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Test
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteIntegration(config.provider)}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remove
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
