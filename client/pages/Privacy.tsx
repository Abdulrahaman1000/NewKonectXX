import { InfoPageLayout } from '@/components/shared/InfoPageLayout';
import { useSettings } from '@/contexts/SettingsContext';

export default function Privacy() {
  const { settings } = useSettings();
  const lastUpdated = 'October 2026';
  const email = settings?.contact?.email;

  return (
    <InfoPageLayout
      title="Privacy Policy"
      description="What we collect, why, who sees it, and how you can have it deleted."
      icon="🔒"
    >
      <p className="text-xs text-white/40">Last updated: {lastUpdated}</p>

      <h2>1. Who we are</h2>
      <p>
        Smart Combo NG ("we", "our", "us") sells gadgets and accessories in Nigeria through this website and our
        mobile app. This policy explains what personal data we collect, how we use it and what choices you have.
      </p>

      <h2>2. What we collect</h2>
      <ul>
        <li>
          <strong>When you place an order:</strong> your name, phone number, email address, delivery address and
          the items you bought.
        </li>
        <li>
          <strong>Payments:</strong> card, bank and USSD payments are handled by Paystack. We never see or store
          your card number, PIN or bank login. We keep the payment reference and the amount paid.
        </li>
        <li>
          <strong>Partner programme:</strong> if you register as a Smart Combo partner we also collect your phone
          or WhatsApp number, email, the bank account details you give us for payouts, and a record of your
          referrals, commissions and withdrawals.
        </li>
        <li>
          <strong>Messages:</strong> anything you type into our chat, our WhatsApp conversations with you and
          messages you send to our AI assistant (see section 5).
        </li>
        <li>
          <strong>Technical data:</strong> basic information such as browser, device type and pages visited that
          our hosting and security systems record.
        </li>
      </ul>

      <h2>3. How we use it</h2>
      <ul>
        <li>To process, deliver and support your orders, including emails about your order status</li>
        <li>To work out free-gift progress: we add up your paid orders from the last 30 days using your phone number</li>
        <li>To pay partner commissions and process withdrawals</li>
        <li>To answer your questions and prevent fraud or abuse</li>
        <li>To improve the site, our products and our service</li>
      </ul>
      <p>We only send promotional messages if you have agreed to receive them.</p>

      <h2>4. Who we share it with</h2>
      <p>We do <strong>not</strong> sell your personal data. We share it only with the services we need to run the store:</p>
      <ul>
        <li>Paystack, to take payment</li>
        <li>Delivery companies, so your parcel reaches you (they receive your name, phone number and address)</li>
        <li>Resend, which sends our order and account emails</li>
        <li>Our hosting and database providers, and Cloudinary, which stores product images</li>
        <li>Google, whose Gemini service powers our AI assistant (see section 5)</li>
        <li>Authorities, when the law requires it</li>
      </ul>

      <h2>5. AI shopping assistant</h2>
      <p>
        When you use "Ask AI", the question you type is sent to Google's Gemini service, together with product
        information from our store, to write a reply. Please do not type card numbers, passwords or other sensitive
        details into the assistant. Its answers can be wrong, so always confirm the final price at checkout.
      </p>

      <h2>6. How long we keep it</h2>
      <p>
        We keep order and payment records for as long as needed for delivery, returns, warranty, accounting and
        resolving disputes. Chat messages and other data we no longer need are deleted or anonymised.
      </p>

      <h2>7. Security</h2>
      <p>
        Our site uses encrypted connections (HTTPS), access to our admin area is protected by a login, and partner
        accounts use signed login tokens. No system is perfectly secure, but we work to protect your data.
      </p>

      <h2>8. Your choices and deleting your data</h2>
      <p>You can ask us at any time to:</p>
      <ul>
        <li>show you the personal data we hold about you</li>
        <li>correct anything that is wrong</li>
        <li>delete your data, including your partner account</li>
        <li>stop sending you promotional messages</li>
      </ul>
      <p>
        To make a request, contact us using the details in section 10 from the phone number or email you used with
        us, and say what you want done. We reply within 30 days. When you ask to delete your data we remove your
        personal details, but we may keep records that the law or our accounts require, such as the fact that an
        order was placed and paid, and we will tell you if we have to.
      </p>

      <h2>9. Cookies and stored settings</h2>
      <p>
        We use your browser's storage to remember your cart, your light or dark theme choice, whether you have seen
        our welcome offer and, for partners, your login. These are needed for the site to work. If we add
        advertising tools later, such as Meta or TikTok pixels, we will update this policy first.
      </p>

      <h2>10. Contact us</h2>
      <p>
        Questions or requests about your data?{' '}
        {settings && (
          <>
            {email && (
              <>
                Email us at <a href={`mailto:${email}`}>{email}</a> or{' '}
              </>
            )}
            <a href={settings.contact.whatsappLink} target="_blank" rel="noopener noreferrer">
              chat with us on WhatsApp
            </a>
            .
          </>
        )}
      </p>

      <h2>11. Changes</h2>
      <p>
        We may update this policy. The latest version is always on this page with its "Last updated" date.
      </p>
    </InfoPageLayout>
  );
}
