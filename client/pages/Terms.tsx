import { InfoPageLayout } from '@/components/shared/InfoPageLayout';
import { useSettings } from '@/contexts/SettingsContext';

export default function Terms() {
  const { settings } = useSettings();
  const lastUpdated = 'October 2026';
  const email = settings?.contact?.email;

  return (
    <InfoPageLayout
      title="Terms & Conditions"
      description="The rules for using Smart Combo and buying from our store."
      icon="📜"
    >
      <p className="text-xs text-white/40">Last updated: {lastUpdated}</p>

      <h2>1. Agreement</h2>
      <p>
        By using the Smart Combo website or app ("the Site") and buying from us, you agree to these Terms &
        Conditions. If you do not agree, please do not use the Site.
      </p>

      <h2>2. Products and pricing</h2>
      <p>
        We try to show products, pictures and prices accurately, but mistakes can happen. We may correct errors and
        change prices at any time. The price that applies to your order is the price shown when you place it.
        Prices are in Nigerian Naira (₦). Delivery fees, where they apply, are added to your order total at
        checkout.
      </p>

      <h2>3. Combos</h2>
      <p>
        A combo is a bundle of items sold together at a bundle price. When you build your own combo, the discount
        shown at checkout applies to that bundle only. Combo and product availability depends on stock.
      </p>

      <h2>4. Free gift offer</h2>
      <p>
        When what you have paid for in the last 30 days (matched by your phone number) plus your current order
        reaches the amount shown on the Site, you can choose a free gift with that order. One gift is given per
        qualifying order, after which your total starts again from zero. Gifts depend on stock, have no cash value,
        cannot be exchanged for money and are not given on cancelled or refunded orders. We may change or end the
        offer at any time, and it never affects orders already paid.
      </p>

      <h2>5. Orders and acceptance</h2>
      <p>
        Placing an order is an offer to buy, not a confirmed sale. We may refuse or cancel an order, for example
        for unavailability, a pricing error, suspected fraud or a breach of these terms. If we cancel an order you
        have already paid for, we will refund it in full.
      </p>
      <p>
        Items in an order that is not paid for within a few hours are held only briefly. If payment is not
        completed, the order may be cancelled automatically so the items can go back on sale, and you will need to
        place a new order.
      </p>

      <h2>6. Payment</h2>
      <p>
        Online payments are processed by Paystack (card, bank transfer, USSD and other methods it offers). Other
        payment options, such as cash on delivery where available, are shown at checkout. Orders are processed once
        payment is confirmed.
      </p>

      <h2>7. Delivery</h2>
      <p>
        Delivery times are estimates, not guarantees. We are not responsible for delays caused by couriers,
        weather, public holidays or events outside our control. See our <a href="/shipping">Shipping page</a> for
        details.
      </p>

      <h2>8. Returns and warranty</h2>
      <p>
        Our return and warranty terms are on the <a href="/returns">Returns page</a>. By buying, you agree to them.
      </p>

      <h2>9. Partner programme</h2>
      <p>
        If you join as a partner, you earn a commission on eligible orders placed through your link. Commission
        rates, the holding period and the payout schedule are shown in your partner dashboard and may change for
        future orders but never for orders already placed. Commission is not earned on your own purchases, on free
        gifts, or on cancelled or refunded orders. We may refuse, hold or cancel commission and close a partner
        account where we find fraud, self-referral or misleading promotion.
      </p>

      <h2>10. AI assistant</h2>
      <p>
        Our AI assistant gives general help about our products and can make mistakes. Prices, stock and delivery
        details are only final at checkout.
      </p>

      <h2>11. Intellectual property</h2>
      <p>
        The content of the Site, including logos, text and images, belongs to Smart Combo NG or its licensors. You
        may not copy or reuse it without our written permission.
      </p>

      <h2>12. Limitation of liability</h2>
      <p>
        As far as the law allows, Smart Combo NG is not liable for indirect or consequential loss from using the
        Site or our products. Our total liability for any claim is limited to the amount you paid for the product
        concerned. Nothing here limits your rights under Nigerian consumer law.
      </p>

      <h2>13. Governing law</h2>
      <p>
        These terms are governed by the laws of the Federal Republic of Nigeria. Disputes will be handled by the
        courts of Kwara State.
      </p>

      <h2>14. Changes</h2>
      <p>
        We may update these terms. The latest version is always on this page with its "Last updated" date. If you
        keep using the Site after a change, you accept the updated terms.
      </p>

      <h2>15. Contact</h2>
      <p>
        Questions about these terms? Use the <a href="/contact">Contact page</a>
        {email && (
          <>
            {' '}or email <a href={`mailto:${email}`}>{email}</a>
          </>
        )}
        .
      </p>
    </InfoPageLayout>
  );
}
