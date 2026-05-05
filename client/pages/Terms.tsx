import { InfoPageLayout } from '@/components/shared/InfoPageLayout';

export default function Terms() {
  const lastUpdated = 'May 2026';

  return (
    <InfoPageLayout
      title="Terms & Conditions"
      description="The terms governing your use of Smart Combo and purchases from our store."
      icon="📜"
    >
      <p className="text-xs text-white/40">Last updated: {lastUpdated}</p>

      <h2>1. Agreement</h2>
      <p>
        By accessing or using the Smart Combo website ("the Site") and purchasing products from us, you agree to
        be bound by these Terms & Conditions. If you do not agree, please do not use the Site.
      </p>

      <h2>2. Products and Pricing</h2>
      <p>
        All product descriptions, images, and prices on the Site are intended as accurate but may contain errors.
        We reserve the right to correct any errors and to update prices at any time. The price applicable to your
        order is the price displayed at the time of order confirmation.
      </p>
      <p>All prices are in Nigerian Naira (₦) and include applicable taxes (VAT).</p>

      <h2>3. Orders and Acceptance</h2>
      <p>
        Placing an order is an offer to buy, not a confirmed purchase. We reserve the right to refuse or cancel
        any order at our discretion, including for reasons such as product unavailability, pricing errors,
        suspected fraud, or violation of these terms. If we cancel your order after payment, we will issue a
        full refund.
      </p>

      <h2>4. Payment</h2>
      <p>
        We accept payment via Paystack and Flutterwave (card, bank transfer, USSD, mobile money), direct bank
        transfer, and Cash on Delivery (Ilorin only). Orders are processed once payment is confirmed.
      </p>

      <h2>5. Delivery</h2>
      <p>
        Delivery times are estimates and not guaranteed. We are not liable for delays caused by courier services,
        weather, public holidays, or events outside our control. See our{' '}
        <a href="/shipping">Shipping page</a> for full details.
      </p>

      <h2>6. Returns and Warranty</h2>
      <p>
        Our return and warranty terms are described on the <a href="/returns">Returns page</a>. By purchasing,
        you agree to those terms.
      </p>

      <h2>7. Intellectual Property</h2>
      <p>
        All content on the Site — including logos, text, images, and code — is owned by Smart Combo NG or its
        licensors and is protected by copyright and trademark laws. You may not copy, reproduce, or distribute
        any content without our written permission.
      </p>

      <h2>8. Limitation of Liability</h2>
      <p>
        To the fullest extent permitted by law, Smart Combo NG shall not be liable for any indirect, incidental,
        special, or consequential damages arising from your use of the Site or our products. Our total liability
        shall not exceed the amount you paid for the product giving rise to the claim.
      </p>

      <h2>9. Governing Law</h2>
      <p>
        These terms are governed by the laws of the Federal Republic of Nigeria. Any disputes will be resolved
        in the courts of Kwara State.
      </p>

      <h2>10. Changes to These Terms</h2>
      <p>
        We may update these terms from time to time. The most current version will always be on this page with
        the "Last updated" date. Continued use of the Site after changes means you accept the updated terms.
      </p>

      <h2>11. Contact</h2>
      <p>
        Questions about these terms? Contact us via the <a href="/contact">Contact page</a>.
      </p>
    </InfoPageLayout>
  );
}
