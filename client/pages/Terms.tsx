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
        Prices are in Nigerian Naira (₦). A delivery fee of ₦1,000 applies to orders delivered in Ilorin and is added to your order total at
        checkout. For other locations, the delivery fee is paid directly to Jumia (see Delivery below).
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

      <h2>5b. Bulk prices and pre-orders</h2>
      <p>
        Bulk prices apply to the whole quantity you order when it reaches the level shown on the product page. Bulk and
        pre-order items are paid online. Delivery in Ilorin for a bulk order is a flat &#8358;2,000 for the whole order.
      </p>
      <p>
        A pre-order item is one we do not have in stock when you order. We get it for you after you pay and show the
        expected time on the product page; this is an estimate. If we cannot get a pre-order item, we refund you for that
        item. If only some pieces are in stock, an order delivered in Ilorin can be sent in parts at your choice, with
        one payment and one delivery fee; orders outside Ilorin are sent together.
      </p>

      <h2>6. Payment</h2>
      <p>
        Online payments are processed by Paystack (card, bank transfer, USSD and other methods it offers). Other
        payment options, such as cash on delivery where available, are shown at checkout. Orders are processed once
        payment is confirmed.
      </p>

      <h2>6b. Paying in instalments</h2>
      <p>
        Some single products and combos can be paid for in instalments, online, when the price of the goods is from ₦10,000 to ₦200,000. For goods priced up to
        ₦50,000 you must pay the full amount within 30 days of your first payment. For goods priced above ₦50,000 and up to ₦200,000 you must pay the full
        amount within 60 days of your first payment. Your first payment must be at least the share shown at checkout. Instalments are not available for bulk
        orders, pre-order items, orders with a free gift, or orders recorded by us on WhatsApp or in person.
      </p>
      <p>
        We keep the item for you from your first payment and send it only after you have paid everything, including the delivery fee where it applies. Payments
        you make are not refunded in cash if you change your mind. If you do not finish paying, we may close the plan. The item then goes back on sale and what
        you paid is kept for you as store credit, for your phone number, for 90 days, to use on a later order with us. If we cannot supply the goods, you get a
        full refund.
      </p>
      <p>
        If you need more time, you can ask once for 3 to 7 extra days, from the last 3 days before your payment date. We may give more time if we choose. By
        ticking the box at checkout you agree to these rules, and we keep a record of the date and time you did.
      </p>

      <h2>6c. Airtime, data and electricity</h2>
      <p>
        You can buy airtime, data bundles and electricity on our Pay page. You pay for each purchase online, through Paystack, and we then send it to the phone
        number or meter you gave us. If you are signed in you can also pay from your Smart Combo wallet (see 6d). The price you see before you pay is the price you are charged.
      </p>
      <p>
        You are responsible for the network, phone number, meter number, meter type and amount you enter. Please check them before you pay. Airtime, data and
        electricity that has been delivered to the number or meter you entered cannot be taken back or refunded, including when it was sent to a wrong number
        or the wrong network.
      </p>
      <p>
        If a purchase fails and nothing is delivered, we refund the full amount to the card or account you paid with (or back to your wallet, if you paid from it). Refunds go through Paystack and can take a
        few working days to reach you. If a purchase is slow, please wait and do not pay again: we check its status with our supplier, and if it was not
        delivered it is refunded. Delivery times depend on the network or electricity company and are not guaranteed. Electricity tokens are shown on the
        result page once the purchase is successful; keep your token and reference.
      </p>
      <p>
        Airtime, data and electricity purchases do not count towards the free gift offer, cannot be paid in instalments, and cannot be paid by cash on delivery.
        We may pause or stop any of these services at any time, for example when our supplier or a network is not available.
      </p>

      <h2>6d. Wallet</h2>
<p>If you are signed in, you can add money to a Smart Combo wallet and use it to pay for airtime, data, electricity, cable TV and exam pins on Smart Combo. Using the wallet is optional. You can always pay directly with Paystack instead, without an account.</p>
<ul>
<li>You add money through Paystack. The smallest top-up is ₦100. We set no largest top-up.</li>
<li>Wallet money can only be spent on Smart Combo. It cannot be withdrawn, cashed out, or sent to another person or account.</li>
<li>The wallet is not a bank account. It earns no interest and it is not covered by any deposit insurance.</li>
<li>If a purchase paid from your wallet fails, the full amount goes back to your wallet.</li>
<li>Referral earnings, bonuses and corrections from us are added to your wallet. They show in your wallet history, and referral earnings are labelled "Referral earnings".</li>
<li>If you think a top-up or a charge is wrong, contact us with the reference. We will check it and put it right.</li>
<li>We may update how the wallet works. If we ever close it, we will tell you first and give you time to spend what is in it.</li>
</ul>
<h2>7. Delivery</h2>
      <p>
        Orders in Ilorin are delivered by us. Orders outside Ilorin are delivered by Jumia: we hand your order to a Jumia
        office and Jumia delivers it to you. Jumia sets that delivery fee and you pay it directly to Jumia. Delivery times are estimates, not guarantees. We are not responsible for delays caused by Jumia, other couriers,
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
