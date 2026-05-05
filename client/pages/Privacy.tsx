import { InfoPageLayout } from '@/components/shared/InfoPageLayout';
import { useSettings } from '@/contexts/SettingsContext';

export default function Privacy() {
  const { settings } = useSettings();
  const lastUpdated = 'May 2026';

  return (
    <InfoPageLayout
      title="Privacy Policy"
      description="How we collect, use, and protect your personal information."
      icon="🔒"
    >
      <p className="text-xs text-white/40">Last updated: {lastUpdated}</p>

      <h2>1. Introduction</h2>
      <p>
        Smart Combo NG ("we", "our", "us") respects your privacy and is committed to protecting your personal
        data. This policy explains how we collect, use, and safeguard your information when you use our website
        or services.
      </p>

      <h2>2. Information We Collect</h2>
      <p>We collect the following types of information:</p>
      <ul>
        <li><strong>Personal information:</strong> name, phone number, email, delivery address</li>
        <li><strong>Payment information:</strong> processed securely by our payment partners (Paystack, Flutterwave) — we never store card details</li>
        <li><strong>Order information:</strong> products purchased, delivery preferences</li>
        <li><strong>Usage data:</strong> pages visited, browser type, device info (via standard analytics)</li>
      </ul>

      <h2>3. How We Use Your Information</h2>
      <ul>
        <li>To process and deliver your orders</li>
        <li>To send order confirmations, shipping updates, and customer support messages</li>
        <li>To respond to your inquiries</li>
        <li>To improve our products, services, and website experience</li>
        <li>To send promotional messages (only if you opt in)</li>
      </ul>

      <h2>4. Information Sharing</h2>
      <p>We do <strong>not</strong> sell your personal information. We share data only with:</p>
      <ul>
        <li>Delivery partners (to ship your orders)</li>
        <li>Payment processors (to handle transactions)</li>
        <li>Service providers who help us operate the website (e.g. hosting, analytics)</li>
        <li>Authorities, when legally required</li>
      </ul>

      <h2>5. Data Security</h2>
      <p>
        We use industry-standard security measures to protect your data, including encrypted connections (HTTPS),
        secure servers, and limited internal access. However, no method of transmission over the internet is 100%
        secure, and we cannot guarantee absolute security.
      </p>

      <h2>6. Your Rights</h2>
      <p>You have the right to:</p>
      <ul>
        <li>Access the personal data we hold about you</li>
        <li>Request corrections to inaccurate data</li>
        <li>Request deletion of your data (subject to legal retention requirements)</li>
        <li>Opt out of marketing communications at any time</li>
      </ul>

      <h2>7. Cookies</h2>
      <p>
        We use cookies and similar technologies to remember your preferences, keep you logged in, and analyze
        site usage. You can disable cookies in your browser settings, but some features may not work properly.
      </p>

      <h2>8. Contact Us</h2>
      <p>
        Questions about this privacy policy?{' '}
        {settings && (
          <>
            Email us at <a href={`mailto:${settings.contact.email}`}>{settings.contact.email}</a> or{' '}
            <a href={settings.contact.whatsappLink} target="_blank" rel="noopener noreferrer">
              chat on WhatsApp
            </a>.
          </>
        )}
      </p>
    </InfoPageLayout>
  );
}
