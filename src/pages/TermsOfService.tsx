import { Link } from 'react-router-dom';
import { Zap, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TermsOfService() {
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
        <h1>Terms of Service</h1>
        <p className="text-muted-foreground">Last updated: March 8, 2026</p>

        <h2>1. Acceptance of Terms</h2>
        <p>By accessing or using ReviveOS ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use the Service. These Terms apply to all users, including visitors, registered users, and paying subscribers.</p>

        <h2>2. Description of Service</h2>
        <p>ReviveOS is a B2B lead revival platform that enables businesses to re-engage dormant leads through AI-generated messaging campaigns. The Service includes lead import and scoring, AI message drafting, campaign management, and multi-channel outreach tools.</p>

        <h2>3. Account Registration</h2>
        <p>To use the Service, you must create an account by providing accurate and complete information. You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. You must notify us immediately of any unauthorized use.</p>

        <h2>4. Acceptable Use</h2>
        <p>You agree to use the Service only for lawful purposes and in compliance with all applicable laws, including but not limited to:</p>
        <ul>
          <li><strong>CAN-SPAM Act (U.S.):</strong> You must not send unsolicited commercial emails without proper consent. All emails must include a valid physical address and a clear unsubscribe mechanism.</li>
          <li><strong>GDPR (EU/EEA):</strong> You must have a lawful basis (e.g., legitimate interest or consent) for processing personal data of EU/EEA residents.</li>
          <li><strong>CASL (Canada):</strong> You must obtain express or implied consent before sending commercial electronic messages to Canadian recipients.</li>
          <li><strong>PECR (UK):</strong> You must comply with the Privacy and Electronic Communications Regulations when contacting UK-based leads.</li>
        </ul>
        <p>You must not use the Service to send spam, phishing messages, or any content that is illegal, harmful, threatening, abusive, or otherwise objectionable.</p>

        <h2>5. Data Processing & Responsibilities</h2>
        <p>As a user of ReviveOS, you act as the <strong>Data Controller</strong> for any personal data you upload or process through the Service. ReviveOS acts as a <strong>Data Processor</strong> on your behalf. You are solely responsible for ensuring you have obtained proper consent or legal basis to process the personal data of your leads.</p>

        <h2>6. AI-Generated Content</h2>
        <p>ReviveOS uses artificial intelligence to generate message drafts for your campaigns. All AI-generated content is provided as suggestions and must be reviewed and approved by you before sending. You are solely responsible for the content of all messages sent through the Service.</p>

        <h2>7. Subscription & Billing</h2>
        <p>The Service offers free and paid subscription plans. Paid plans are billed on a recurring basis. You may cancel your subscription at any time, but no refunds will be issued for partial billing periods. We reserve the right to change pricing with 30 days' notice.</p>

        <h2>8. Service Level & Availability</h2>
        <p>We strive to maintain high availability of the Service but do not guarantee uninterrupted access. We may perform maintenance or updates that temporarily affect availability. We are not liable for any losses resulting from downtime or service interruptions.</p>

        <h2>9. Intellectual Property</h2>
        <p>The Service, including its design, features, and technology, is owned by ReviveOS. You retain ownership of any data you upload. By using the Service, you grant us a limited license to process your data as necessary to provide the Service.</p>

        <h2>10. Limitation of Liability</h2>
        <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, REVIVEOS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR BUSINESS OPPORTUNITIES. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID FOR THE SERVICE IN THE 12 MONTHS PRECEDING THE CLAIM.</p>

        <h2>11. Indemnification</h2>
        <p>You agree to indemnify and hold harmless ReviveOS from any claims, damages, or expenses arising from your use of the Service, your violation of these Terms, or your violation of any applicable law or regulation.</p>

        <h2>12. Termination</h2>
        <p>We may suspend or terminate your account if you violate these Terms or engage in any activity that could harm the Service or other users. Upon termination, your right to use the Service ceases immediately. You may export your data before termination.</p>

        <h2>13. Changes to Terms</h2>
        <p>We reserve the right to modify these Terms at any time. We will notify you of material changes via email or through the Service. Continued use of the Service after changes constitutes acceptance of the updated Terms.</p>

        <h2>14. Governing Law</h2>
        <p>These Terms are governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to conflict of law principles.</p>

        <h2>15. Contact</h2>
        <p>If you have questions about these Terms, please contact us at <a href="mailto:legal@reviveos.com" className="text-primary">legal@reviveos.com</a>.</p>
      </main>
    </div>
  );
}
