import { InfoPageLayout } from '@/components/shared/InfoPageLayout';
import { useSettings } from '@/contexts/SettingsContext';

export default function Shipping() {
  const { settings } = useSettings();

  return (
    <InfoPageLayout
      title="Shipping Information"
      description="How Smart Combo orders are delivered through Jumia, and what delivery costs."
      icon="📦"
    >
      <h2>Delivered by Jumia</h2>
      <p>
        All Smart Combo orders are delivered through <strong>Jumia</strong>. After your order is confirmed,
        we pack it and drop it off at a Jumia office, and Jumia delivers it to you. We deliver to all 36 states
        of Nigeria plus the FCT.
      </p>

      <h2>Delivery Fees</h2>
      <ul>
        <li><strong>Ilorin (Kwara State):</strong> a flat <strong>₦1,000</strong> delivery fee, added to your order total at checkout.</li>
        <li><strong>Everywhere else:</strong> no delivery fee is charged by us. Jumia sets the delivery fee for your location, and you pay it <strong>directly to Jumia</strong> for their delivery service.</li>
      </ul>

      <h2>Delivery Times</h2>
      <p>
        Delivery times depend on Jumia and your location. Orders in Ilorin usually arrive within 2–3 business days.
        For other cities and states, expect roughly 4–7 business days after we hand your order to Jumia.
      </p>

      <h2>Cash on Delivery</h2>
      <p>
        Cash on Delivery (COD) is currently available <strong>only for customers in Ilorin, Kwara State</strong>.
        For all other locations, your order must be paid online before dispatch. Jumia's delivery fee is separate.
      </p>

      <h2>Order Processing</h2>
      <p>
        Orders are processed Monday–Saturday. Orders placed before 1:00 PM are usually dispatched the same day.
        Orders placed on Sundays or public holidays will be processed the next business day.
      </p>

      <h2>Tracking Your Order</h2>
      <p>
        Once your order ships, you'll receive a tracking number via WhatsApp and email. You can also track
        your order anytime on our <a href="/order-tracking">Order Tracking</a> page.
      </p>

      <h2>Questions?</h2>
      <p>
        Need to know more about a specific location?{' '}
        {settings && (
          <a href={settings.contact.whatsappLink} target="_blank" rel="noopener noreferrer">
            Chat with us on WhatsApp
          </a>
        )}{' '}
        — we usually respond within minutes.
      </p>
    </InfoPageLayout>
  );
}
