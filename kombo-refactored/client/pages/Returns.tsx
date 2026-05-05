import { InfoPageLayout } from '@/components/shared/InfoPageLayout';
import { useSettings } from '@/contexts/SettingsContext';

export default function Returns() {
  const { settings } = useSettings();

  return (
    <InfoPageLayout
      title="Returns & Refunds"
      description="Our 14-day return policy and refund process."
      icon="↩️"
    >
      <h2>14-Day Return Policy</h2>
      <p>
        Not satisfied with your purchase? You can return any unused item in its original packaging within
        <strong> 14 days </strong> of delivery for a full refund or exchange.
      </p>

      <h2>What Can Be Returned?</h2>
      <ul>
        <li>Items still in their original, unopened packaging</li>
        <li>Items that have not been used or worn</li>
        <li>Items with all original accessories, tags, and documentation</li>
      </ul>

      <h2>What Cannot Be Returned?</h2>
      <ul>
        <li>Items showing signs of wear, use, or damage</li>
        <li>Items missing original packaging or accessories</li>
        <li>Items returned more than 14 days after delivery</li>
      </ul>

      <h2>How to Return an Item</h2>
      <ol>
        <li>Contact us via WhatsApp or email within 14 days of delivery</li>
        <li>Provide your order number and reason for return</li>
        <li>We'll send you return instructions and address</li>
        <li>Ship the item back to us using a trackable courier</li>
        <li>We'll inspect the item within 2 business days of receipt</li>
        <li>Refund or exchange will be processed within 5 business days</li>
      </ol>

      <h2>Refund Method</h2>
      <p>
        Refunds are issued to the original payment method. Bank transfer refunds typically arrive within
        3–5 business days. Card refunds may take 7–10 business days depending on your bank.
      </p>

      <h2>Faulty or Damaged Items</h2>
      <p>
        If your item arrives faulty or damaged, contact us within <strong>48 hours</strong> of delivery with
        photos showing the issue. We cover all return shipping costs for faulty items and will send a
        replacement at no charge.
      </p>

      <h2>Warranty Claims</h2>
      <p>
        All products come with a <strong>1-year manufacturer warranty</strong>. Warranty claims are handled
        separately from returns —{' '}
        {settings && (
          <a href={settings.contact.whatsappLink} target="_blank" rel="noopener noreferrer">
            contact us on WhatsApp
          </a>
        )}{' '}
        for warranty support.
      </p>
    </InfoPageLayout>
  );
}
