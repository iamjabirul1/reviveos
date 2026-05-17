// Shared Brevo (Sendinblue) transactional email helper.
// All email sends in this project go through this helper.

const BREVO_URL = "https://api.brevo.com/v3/smtp/email";

export interface BrevoSendInput {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string; // "Name <email>" or just "email"
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  apiKey?: string; // override env var
}

export interface BrevoSendResult {
  success: boolean;
  error?: string;
  messageId?: string;
}

function parseFrom(from?: string): { name?: string; email?: string } {
  if (!from) return {};
  const m = from.match(/^\s*(.+?)\s*<\s*([^>]+)\s*>\s*$/);
  if (m) return { name: m[1], email: m[2] };
  return { email: from.trim() };
}

export async function sendBrevoEmail(input: BrevoSendInput): Promise<BrevoSendResult> {
  const apiKey = input.apiKey ?? Deno.env.get("BREVO_API_KEY");
  if (!apiKey) return { success: false, error: "BREVO_API_KEY not configured" };

  const parsed = parseFrom(input.from);
  const senderEmail =
    input.fromEmail ?? parsed.email ?? Deno.env.get("BREVO_SENDER_EMAIL");
  const senderName =
    input.fromName ?? parsed.name ?? Deno.env.get("BREVO_SENDER_NAME") ?? "ReviveOS";

  if (!senderEmail) {
    return { success: false, error: "No sender email (set BREVO_SENDER_EMAIL)" };
  }

  const recipients = (Array.isArray(input.to) ? input.to : [input.to])
    .filter(Boolean)
    .map((email) => ({ email }));
  if (recipients.length === 0) return { success: false, error: "No recipients" };

  const body: Record<string, unknown> = {
    sender: { name: senderName, email: senderEmail },
    to: recipients,
    subject: input.subject,
  };
  if (input.html) body.htmlContent = input.html;
  if (input.text) body.textContent = input.text;
  if (input.replyTo) body.replyTo = { email: input.replyTo };

  try {
    const res = await fetch(BREVO_URL, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const j = await res.json().catch(() => ({}));
      return { success: true, messageId: j?.messageId };
    }
    const errText = await res.text();
    return { success: false, error: `Brevo ${res.status}: ${errText}` };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown Brevo error",
    };
  }
}
