import { Link } from 'react-router-dom';
import { Zap, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl tracking-tight">ReviveOS</span>
          </Link>
          <Link to="/">
            <Button variant="ghost"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Button>
          </Link>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-12 max-w-3xl prose prose-neutral dark:prose-invert">
        <h1>Privacy Policy</h1>
        <p className="text-muted-foreground">Last updated: March 8, 2026</p>

        <h2>1. Introduction</h2>
        <p>ReviveOS ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your personal information when you use our lead revival platform ("Service"). This policy applies to all users, including account holders and the leads whose data is processed through our Service.</p>

        <h2>2. Information We Collect</h2>
        <h3>2.1 Account Information</h3>
        <p>When you register, we collect your name, email address, and password. If you subscribe to a paid plan, we collect billing information through our payment processor.</p>

        <h3>2.2 Lead Data (Uploaded by You)</h3>
        <p>You may upload lead information including names, email addresses, phone numbers, company names, and other business contact details. You are the Data Controller for this data and are responsible for ensuring you have a lawful basis to process it.</p>

        <h3>2.3 Usage Data</h3>
        <p>We automatically collect information about how you interact with the Service, including pages visited, features used, campaign performance metrics, and browser/device information.</p>

        <h3>2.4 Cookies & Tracking</h3>
        <p>We use essential cookies for authentication and session management. We do not use third-party advertising trackers.</p>

        <h2>3. How We Use Your Information</h2>
        <p>We use collected information to:</p>
        <ul>
          <li>Provide, maintain, and improve the Service</li>
          <li>Process your lead data for AI-generated messaging as directed by you</li>
          <li>Send transactional emails (account verification, password resets, billing)</li>
          <li>Monitor Service usage for security and abuse prevention</li>
          <li>Comply with legal obligations</li>
        </ul>

        <h2>4. Legal Basis for Processing (GDPR)</h2>
        <p>For users in the EU/EEA/UK, we process your personal data under the following legal bases:</p>
        <ul>
          <li><strong>Contract:</strong> Processing necessary to provide the Service you've requested</li>
          <li><strong>Legitimate Interest:</strong> Service improvement, security, and fraud prevention</li>
          <li><strong>Legal Obligation:</strong> Compliance with applicable laws and regulations</li>
          <li><strong>Consent:</strong> Where required, such as for optional marketing communications</li>
        </ul>

        <h2>5. Data Sharing & Third Parties</h2>
        <p>We do not sell your personal data. We share data only with:</p>
        <ul>
          <li><strong>Service Providers:</strong> Cloud hosting (Supabase), email delivery (Resend), AI processing (Cerebras) — all bound by data processing agreements</li>
          <li><strong>Legal Requirements:</strong> When required by law, court order, or governmental authority</li>
          <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
        </ul>

        <h2>6. International Data Transfers</h2>
        <p>Your data may be transferred to and processed in countries outside the EU/EEA. We ensure appropriate safeguards are in place, including Standard Contractual Clauses (SCCs) approved by the European Commission, to protect your data in accordance with GDPR requirements.</p>

        <h2>7. Data Retention</h2>
        <p>We retain your account data for as long as your account is active. Lead data is retained until you delete it or close your account. After account deletion, we retain anonymized usage data for analytics and may retain certain data as required by law. Backups containing your data are purged within 90 days of deletion.</p>

        <h2>8. Your Rights (GDPR)</h2>
        <p>If you are in the EU/EEA/UK, you have the right to:</p>
        <ul>
          <li><strong>Access:</strong> Request a copy of your personal data</li>
          <li><strong>Rectification:</strong> Correct inaccurate or incomplete data</li>
          <li><strong>Erasure:</strong> Request deletion of your personal data ("right to be forgotten")</li>
          <li><strong>Restriction:</strong> Request we limit how we process your data</li>
          <li><strong>Portability:</strong> Receive your data in a structured, machine-readable format</li>
          <li><strong>Objection:</strong> Object to processing based on legitimate interest</li>
          <li><strong>Withdraw Consent:</strong> Where processing is based on consent, withdraw it at any time</li>
        </ul>
        <p>To exercise these rights, contact us at <a href="mailto:privacy@reviveos.com" className="text-primary">privacy@reviveos.com</a>. We will respond within 30 days.</p>

        <h2>9. CAN-SPAM Compliance</h2>
        <p>ReviveOS supports CAN-SPAM compliance by:</p>
        <ul>
          <li>Providing suppression list management to honor opt-out requests</li>
          <li>Requiring users to include a valid physical address in campaigns</li>
          <li>Supporting clear identification of commercial messages</li>
          <li>Processing unsubscribe requests within 10 business days</li>
          <li>Flagging leads with "do not contact" status to prevent unwanted outreach</li>
        </ul>

        <h2>10. Data Security</h2>
        <p>We implement industry-standard security measures including:</p>
        <ul>
          <li>Encryption in transit (TLS/SSL) and at rest</li>
          <li>Row-level security policies on all database tables</li>
          <li>Regular security audits and vulnerability assessments</li>
          <li>Role-based access controls within workspaces</li>
          <li>Secure secret management for API keys and credentials</li>
        </ul>

        <h2>11. Children's Privacy</h2>
        <p>The Service is not intended for individuals under 18 years of age. We do not knowingly collect personal data from children. If we become aware that we have collected data from a child, we will delete it promptly.</p>

        <h2>12. Changes to This Policy</h2>
        <p>We may update this Privacy Policy from time to time. We will notify you of material changes via email or through the Service. The "Last updated" date at the top reflects the most recent revision.</p>

        <h2>13. Data Protection Officer</h2>
        <p>For GDPR-related inquiries, you may contact our Data Protection Officer at <a href="mailto:dpo@reviveos.com" className="text-primary">dpo@reviveos.com</a>.</p>

        <h2>14. Supervisory Authority</h2>
        <p>If you are in the EU/EEA, you have the right to lodge a complaint with your local data protection supervisory authority if you believe your data has been processed unlawfully.</p>

        <h2>15. Contact Us</h2>
        <p>For any privacy-related questions or requests, contact us at:</p>
        <ul>
          <li>Email: <a href="mailto:privacy@reviveos.com" className="text-primary">privacy@reviveos.com</a></li>
          <li>Website: <a href="https://reviveos.com" className="text-primary">reviveos.com</a></li>
        </ul>
      </main>
    </div>
  );
}
