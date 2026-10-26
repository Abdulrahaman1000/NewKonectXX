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

      <h2>Bulk orders (buy more, pay less)</h2>
      <p>
        Some products have a lower price for each piece when you buy more. The price list is on the product page, and the
        total updates as you change the number of pieces. Bulk orders are paid online. Delivery in Ilorin for a bulk order
        is a flat <strong>&#8358;2,000</strong> for the whole order, however many pieces. Outside Ilorin, a bulk order goes
        through Jumia in the same way as any other order.
      </p>

      <h2>Pre-order items and orders sent in parts</h2>
      <p>
        When a product is out of stock, it may show <strong>Pre-order</strong>. We get it for you after you pay, and the
        product page shows how many business days it takes. Pre-order items are paid online. If we cannot get the item,
        you get your money back for it.
      </p>
      <p>
        If you ask for more pieces than we have ready, your order is split. In Ilorin you choose at checkout:
      </p>
      <ul>
        <li><strong>Send what is ready now</strong>: we deliver the ready pieces straight away and the rest when they arrive.
          You pay once and delivery is charged once.</li>
        <li><strong>Send everything together</strong>: we wait for all the pieces and deliver them in one go.</li>
      </ul>
      <p>
        Outside Ilorin, everything is sent together in one parcel through Jumia once all pieces are with us. You can see
        what is happening with each part on the <a href="/order-tracking">Order Tracking</a> page.
      </p>
      <p>
        Not sure how to go about it? Ask our AI chat, or talk to a person at our customer service.
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
