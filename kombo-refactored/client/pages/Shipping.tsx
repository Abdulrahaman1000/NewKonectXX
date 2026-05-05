import { InfoPageLayout } from '@/components/shared/InfoPageLayout';
import { useSettings } from '@/contexts/SettingsContext';

export default function Shipping() {
  const { settings } = useSettings();

  return (
    <InfoPageLayout
      title="Shipping Information"
      description="Delivery areas, times, and costs across Nigeria."
      icon="📦"
    >
      <h2>Delivery Areas</h2>
      <p>We deliver to all 36 states of Nigeria plus the FCT.</p>

      <h2>Delivery Times</h2>
      <ul>
        <li><strong>Ilorin (Kwara State):</strong> 2–3 business days</li>
        <li><strong>Major cities (Lagos, Abuja, Port Harcourt, Kano, Ibadan):</strong> 4–5 business days</li>
        <li><strong>Other states:</strong> 5–7 business days</li>
      </ul>

      <h2>Shipping Costs</h2>
      <p>
        We offer <strong>free nationwide delivery</strong> on all combo orders during our launch promo period.
        After the promo, standard delivery rates will apply based on your state.
      </p>

      <h2>Cash on Delivery</h2>
      <p>
        Cash on Delivery (COD) is currently available <strong>only for customers in Ilorin, Kwara State</strong>.
        For all other locations, payment must be completed online before dispatch.
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
