import { InfoPageLayout } from '@/components/shared/InfoPageLayout';
import { useSettings } from '@/contexts/SettingsContext';

export default function Shipping() {
  const { settings } = useSettings();

  return (
    <InfoPageLayout
      title="Shipping Information"
      description="How delivery works in Ilorin and across Nigeria, and what it costs."
      icon="📦"
    >
      <h2>Delivery in Ilorin</h2>
      <p>
        Orders in Ilorin (Kwara State) are delivered by us directly. Delivery costs a flat <strong>₦1,000</strong>,
        added to your order total at checkout, and usually arrives within 2–3 business days. Cash on Delivery is
        available in Ilorin.
      </p>

      <h2>Delivery outside Ilorin</h2>
      <p>
        We deliver to all 36 states and the FCT. Outside Ilorin, your order is sent through <strong>Jumia</strong>:
        we pack it and drop it at a Jumia office, and Jumia delivers it to you.
      </p>
      <ul>
        <li>We do <strong>not</strong> add a delivery fee to your order on our site.</li>
        <li>Jumia sets the delivery fee for your location, and you pay it <strong>directly to Jumia</strong>.</li>
        <li>Delivery usually takes about 4–7 business days after we hand your order to Jumia, depending on your location.</li>
        <li>Orders outside Ilorin must be paid online before dispatch (Cash on Delivery is Ilorin only).</li>
      </ul>

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
