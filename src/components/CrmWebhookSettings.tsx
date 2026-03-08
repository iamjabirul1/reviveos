import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Copy, CheckCircle2, Loader2, Send } from 'lucide-react';

const CRM_SOURCES = [
  { source: 'hubspot', label: 'HubSpot', events: ['contact_updated', 'deal_updated'] },
  { source: 'gohighlevel', label: 'GoHighLevel', events: ['contact_updated', 'deal_updated'] },
  { source: 'shopify', label: 'Shopify', events: ['shopify_customer', 'shopify_order'] },
  { source: 'calendly', label: 'Calendly', events: ['booking_created'] },
];

interface CrmWebhookSettingsProps {
  workspaceId?: string;
}

export default function CrmWebhookSettings({ workspaceId }: CrmWebhookSettingsProps) {
  const { toast } = useToast();
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, 'success' | 'error' | null>>({});

  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crm-webhook`;

  function copyUrl(source: string) {
    navigator.clipboard.writeText(`${baseUrl}?source=${source}`);
    toast({ title: 'Copied to clipboard' });
  }

  async function testWebhook(source: string) {
    if (!workspaceId) return;
    setTesting(source);
    setTestResults((prev) => ({ ...prev, [source]: null }));

    try {
      const testPayload = {
        workspace_id: workspaceId,
        event_type: 'contact_updated',
        email: `test-${Date.now()}@webhook-test.local`,
        first_name: 'Webhook',
        last_name: 'Test',
        company: 'Test Company',
        source,
      };

      const res = await fetch(`${baseUrl}?source=${source}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setTestResults((prev) => ({ ...prev, [source]: 'success' }));
        toast({ title: `${source} webhook test passed`, description: `Lead ${data.action} successfully.` });

        // Clean up test lead
        if (data.action === 'created') {
          await supabase
            .from('leads')
            .delete()
            .eq('workspace_id', workspaceId)
            .eq('email', testPayload.email);
        }
      } else {
        setTestResults((prev) => ({ ...prev, [source]: 'error' }));
        toast({ title: 'Webhook test failed', description: data.error || 'Unknown error', variant: 'destructive' });
      }
    } catch (err) {
      setTestResults((prev) => ({ ...prev, [source]: 'error' }));
      toast({ title: 'Test failed', description: err instanceof Error ? err.message : 'Network error', variant: 'destructive' });
    } finally {
      setTesting(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>CRM Webhook URLs</CardTitle>
        <CardDescription>
          Paste these URLs into your CRM's webhook settings to sync leads automatically.
          Use the Test button to verify each connection works.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {CRM_SOURCES.map(({ source, label, events }) => {
          const webhookUrl = `${baseUrl}?source=${source}`;
          const result = testResults[source];

          return (
            <div key={source} className="space-y-2 pb-4 border-b last:border-0 last:pb-0">
              <div className="flex items-center justify-between">
                <Label className="font-medium">{label}</Label>
                {result === 'success' && (
                  <Badge variant="default" className="text-xs gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Connected
                  </Badge>
                )}
                {result === 'error' && (
                  <Badge variant="destructive" className="text-xs">Failed</Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Input readOnly value={webhookUrl} className="font-mono text-xs" />
                <Button variant="outline" size="sm" onClick={() => copyUrl(source)}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testWebhook(source)}
                  disabled={testing === source || !workspaceId}
                >
                  {testing === source ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {events.map((evt) => (
                  <Badge key={evt} variant="outline" className="font-mono text-[10px]">{evt}</Badge>
                ))}
              </div>
            </div>
          );
        })}

        <div className="space-y-2 pt-2">
          <Label className="text-xs text-muted-foreground">Example Payload</Label>
          <pre className="bg-muted rounded-lg p-3 text-xs font-mono overflow-x-auto">
{JSON.stringify({
  workspace_id: workspaceId ?? '<workspace_id>',
  event_type: 'contact_updated',
  email: 'lead@example.com',
  first_name: 'Jane',
  last_name: 'Doe',
  company: 'Acme Inc',
  deal_value: 5000,
}, null, 2)}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}
