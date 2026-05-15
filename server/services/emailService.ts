/**
 * Email service.
 *
 * Wraps Resend with safe defaults + typed templates for each lifecycle email:
 *  - sendOrderPlaced            — to customer, when order is created
 *  - sendPaymentConfirmed       — to customer, when Paystack payment succeeds
 *  - sendOrderShipped           — to customer, when admin marks shipped
 *  - sendOrderDelivered         — to customer, when admin marks delivered
 *  - sendNewOrderAdminAlert     — to YOU, when any new order comes in
 *
 * All sends are non-throwing: if Resend fails we log and continue. Email
 * failures should never break order creation or payment flows.
 *
 * If RESEND_API_KEY is empty, sends are skipped entirely (logged as no-op).
 * This way the app works fine in dev without configuring email.
 */

import { Resend } from "resend";
import { config } from "../config";

const resend = config.resend.apiKey ? new Resend(config.resend.apiKey) : null;

interface OrderEmailContext {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  total: number;
  items: Array<{ name: string; quantity: number; subtotal: number }>;
  shippingAddress: {
    fullName: string;
    street: string;
    city: string;
    state: string;
    phone: string;
  };
  paymentMethod: string;
  trackingUrl?: string;
}

const formatNGN = (amount: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);

// Shared HTML wrapper — keeps each template focused on the unique content
function wrap(opts: {
  preheader: string;       // hidden preview text in inbox
  title: string;
  body: string;            // raw HTML for body section
  ctaText?: string;
  ctaUrl?: string;
}) {
  const cta = opts.ctaText && opts.ctaUrl
    ? `<div style="text-align:center;margin:32px 0;">
         <a href="${opts.ctaUrl}" style="display:inline-block;background:#FFD700;color:#000;padding:14px 32px;border-radius:8px;font-weight:bold;text-decoration:none;font-size:14px;">${opts.ctaText}</a>
       </div>`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${opts.title}</title>
</head>
<body style="margin:0;padding:0;background:#f7f7f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;">${opts.preheader}</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f7;padding:24px 12px;">
<tr><td align="center">

<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.04);">

<!-- Header -->
<tr><td style="background:linear-gradient(135deg,#1a1a1a 0%,#2a2a2a 100%);padding:24px;text-align:center;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
    <tr>
      <td style="background:linear-gradient(135deg,#FFD700,#FFA500);width:36px;height:36px;border-radius:8px;text-align:center;vertical-align:middle;">
        <span style="color:#000;font-weight:900;font-size:13px;">SC</span>
      </td>
      <td style="padding-left:10px;">
        <div style="color:#fff;font-weight:900;font-size:14px;line-height:1;">Smart Combo</div>
        <div style="color:#FFD700;font-size:9px;letter-spacing:2px;text-transform:uppercase;line-height:1.5;">Premium combos</div>
      </td>
    </tr>
  </table>
</td></tr>

<!-- Body -->
<tr><td style="padding:32px 28px;color:#1a1a1a;">
  <h1 style="margin:0 0 16px;font-size:22px;font-weight:900;color:#1a1a1a;line-height:1.3;">${opts.title}</h1>
  ${opts.body}
  ${cta}
</td></tr>

<!-- Footer -->
<tr><td style="background:#fafafa;padding:20px;text-align:center;border-top:1px solid #eee;">
  <p style="margin:0 0 4px;font-size:11px;color:#666;">Smart Combo · Ilorin, Kwara · Nigeria</p>
  <p style="margin:0;font-size:10px;color:#999;">If you didn't place this order, please reply and let us know.</p>
</td></tr>

</table>
</td></tr></table>
</body>
</html>`;
}

function itemRows(items: OrderEmailContext["items"]): string {
  return items
    .map(
      (it) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;">
            <div style="font-size:14px;color:#1a1a1a;font-weight:600;">${it.name}</div>
            <div style="font-size:11px;color:#999;">Qty ${it.quantity}</div>
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;text-align:right;font-size:14px;color:#1a1a1a;font-weight:600;">${formatNGN(it.subtotal)}</td>
        </tr>`,
    )
    .join("");
}

function shippingBlock(addr: OrderEmailContext["shippingAddress"]): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border-radius:8px;padding:16px;margin:20px 0;">
      <tr><td>
        <div style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;font-weight:bold;margin-bottom:6px;">Delivery to</div>
        <div style="font-size:14px;color:#1a1a1a;font-weight:600;">${addr.fullName}</div>
        <div style="font-size:13px;color:#666;line-height:1.5;">${addr.street}<br>${addr.city}, ${addr.state}<br>${addr.phone}</div>
      </td></tr>
    </table>`;
}

function orderSummaryBlock(ctx: OrderEmailContext): string {
  return `
    <div style="margin:20px 0;">
      <div style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;font-weight:bold;margin-bottom:10px;">Order ${ctx.orderNumber}</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${itemRows(ctx.items)}
        <tr>
          <td style="padding:14px 0 0;font-size:14px;font-weight:bold;color:#1a1a1a;">Total</td>
          <td style="padding:14px 0 0;text-align:right;font-size:18px;font-weight:900;color:#1a1a1a;">${formatNGN(ctx.total)}</td>
        </tr>
      </table>
    </div>
    ${shippingBlock(ctx.shippingAddress)}`;
}

async function send(args: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  if (!resend) {
    console.log(`📧 Email skipped (no RESEND_API_KEY): "${args.subject}" → ${args.to}`);
    return;
  }
  try {
    const result = await resend.emails.send({
      from: config.resend.from,
      to: args.to,
      subject: args.subject,
      html: args.html,
      replyTo: config.resend.replyTo || undefined,
    });
    if (result.error) {
      console.error(`❌ Email send error: ${result.error.message}`);
    } else {
      console.log(`📧 Sent: "${args.subject}" → ${args.to} (id: ${result.data?.id})`);
    }
  } catch (err: any) {
    console.error(`❌ Email send threw:`, err?.message ?? err);
  }
}

// === Templates ===

export async function sendOrderPlaced(ctx: OrderEmailContext): Promise<void> {
  const isPaystack = ctx.paymentMethod === "paystack";
  const intro = isPaystack
    ? `<p style="font-size:14px;color:#444;line-height:1.6;">Thanks for your order, ${ctx.customerName.split(" ")[0]}! Once your payment is confirmed we'll start preparing your combo for shipment.</p>`
    : `<p style="font-size:14px;color:#444;line-height:1.6;">Thanks for your order, ${ctx.customerName.split(" ")[0]}! We've received it and will be in touch shortly with payment details.</p>`;

  const html = wrap({
    preheader: `Order ${ctx.orderNumber} received — ${formatNGN(ctx.total)}`,
    title: "Order received",
    body: intro + orderSummaryBlock(ctx),
    ctaText: ctx.trackingUrl ? "Track your order" : undefined,
    ctaUrl: ctx.trackingUrl,
  });

  await send({
    to: ctx.customerEmail,
    subject: `Order ${ctx.orderNumber} received`,
    html,
  });
}

export async function sendPaymentConfirmed(ctx: OrderEmailContext): Promise<void> {
  const html = wrap({
    preheader: `Payment received for order ${ctx.orderNumber}`,
    title: "🎉 Payment confirmed",
    body: `
      <p style="font-size:14px;color:#444;line-height:1.6;">Great news, ${ctx.customerName.split(" ")[0]}! We've received your payment of <strong>${formatNGN(ctx.total)}</strong>. Your combo is now being prepared for shipment.</p>
      <p style="font-size:14px;color:#444;line-height:1.6;">We'll send another email once your order ships.</p>
      ${orderSummaryBlock(ctx)}
    `,
    ctaText: ctx.trackingUrl ? "Track your order" : undefined,
    ctaUrl: ctx.trackingUrl,
  });

  await send({
    to: ctx.customerEmail,
    subject: `Payment confirmed for order ${ctx.orderNumber}`,
    html,
  });
}

export async function sendOrderShipped(
  ctx: OrderEmailContext & { trackingNumber?: string; trackingProviderUrl?: string },
): Promise<void> {
  const trackingLine = ctx.trackingNumber
    ? `<p style="font-size:13px;color:#666;">Tracking number: <strong>${ctx.trackingNumber}</strong></p>`
    : "";

  const html = wrap({
    preheader: `Your order ${ctx.orderNumber} is on the way`,
    title: "📦 Your order is on the way",
    body: `
      <p style="font-size:14px;color:#444;line-height:1.6;">Hi ${ctx.customerName.split(" ")[0]} — your combo is now in transit. Estimated delivery: 1-3 business days.</p>
      ${trackingLine}
      ${orderSummaryBlock(ctx)}
    `,
    ctaText: ctx.trackingProviderUrl ? "Track shipment" : ctx.trackingUrl ? "Track order" : undefined,
    ctaUrl: ctx.trackingProviderUrl || ctx.trackingUrl,
  });

  await send({
    to: ctx.customerEmail,
    subject: `Your order ${ctx.orderNumber} has shipped`,
    html,
  });
}

export async function sendOrderDelivered(ctx: OrderEmailContext): Promise<void> {
  const html = wrap({
    preheader: `Order ${ctx.orderNumber} delivered — hope you love it`,
    title: "Hope you love it 💛",
    body: `
      <p style="font-size:14px;color:#444;line-height:1.6;">Hi ${ctx.customerName.split(" ")[0]} — your order has been delivered. We'd love to hear what you think.</p>
      <p style="font-size:14px;color:#444;line-height:1.6;">Reply to this email if anything's off, or share a quick review on WhatsApp. Repeat customers get early access to new combos.</p>
    `,
  });

  await send({
    to: ctx.customerEmail,
    subject: `Order ${ctx.orderNumber} delivered`,
    html,
  });
}

export async function sendNewOrderAdminAlert(ctx: OrderEmailContext): Promise<void> {
  if (!config.resend.adminNotify) {
    return; // No admin email configured, skip silently
  }

  const html = wrap({
    preheader: `New order ${ctx.orderNumber} — ${formatNGN(ctx.total)}`,
    title: `🔔 New order: ${ctx.orderNumber}`,
    body: `
      <p style="font-size:14px;color:#444;line-height:1.6;">A new order just came in. Customer: <strong>${ctx.customerName}</strong> (${ctx.customerEmail})</p>
      <p style="font-size:14px;color:#444;line-height:1.6;">Payment method: <strong>${ctx.paymentMethod}</strong></p>
      ${orderSummaryBlock(ctx)}
    `,
    ctaText: "Open in admin",
    ctaUrl: `${config.siteUrl}/admin/orders`,
  });

  await send({
    to: config.resend.adminNotify,
    subject: `🔔 New order: ${ctx.orderNumber} — ${formatNGN(ctx.total)}`,
    html,
  });
}
