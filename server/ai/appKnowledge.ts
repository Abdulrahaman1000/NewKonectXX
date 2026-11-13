/**
 * SC-KB  What the assistant knows about everything beyond combos: paying bills, the wallet,
 * the customer account, reminders, instalments, bulk orders and pre-orders.
 *
 * Written plain on purpose. To change what the assistant says, edit the text below, save, and restart.
 * Rule: only write what is really live on the site. Do not list coming-soon features here.
 * Each entry can carry `actions` (buttons under the answer) and `followUps` (tappable next questions).
 */
import type { KDoc } from "./retrieve";

const PAY = { label: "Pay bills", link: "/pay" };
const WALLET = { label: "Open my wallet", link: "/wallet" };
const SIGNIN = { label: "Sign in", link: "/account" };
const SPENDING = { label: "My spending", link: "/spending" };
const REMINDERS = { label: "My reminders", link: "/reminders" };
const TRACK = { label: "Track my order", link: "/order-tracking" };

const d = (id: string, title: string, text: string, extra: Partial<KDoc> = {}): KDoc => ({ id, type: "policy", title, text, ...extra });

export const APP_DOCS: KDoc[] = [
  d("bills:overview", "Pay bills: airtime, data, electricity, TV and exam pins",
    "Smart Combo lets you pay bills on the Pay page. You can buy airtime and data for MTN, Airtel, Glo and 9mobile, buy electricity tokens, pay for TV (DStv, GOtv, StarTimes, Showmax) and buy exam pins (WAEC result checker, WAEC GCE, WAEC registration and JAMB). " +
    "You can pay with your card or bank transfer without an account, or from your Smart Combo wallet if you are signed in. Most purchases are delivered in seconds and the result page shows what you bought. Keep the reference shown on the result page (it starts with SC-VTU-).",
    { link: "/pay", actions: [PAY], followUps: ["How do I buy data?", "How do I buy electricity?", "How do I pay from my wallet?"] }),

  d("bills:airtime", "Buy airtime (MTN, Airtel, Glo, 9mobile)",
    "To buy airtime: 1. Open Pay bills and choose Airtime. 2. Pick the network. 3. Type the phone number and the amount. 4. Tap Pay and choose how to pay (card or bank transfer, or your wallet). " +
    "The airtime is sent to the number straight after payment, usually in seconds. Check the number carefully before paying because airtime sent to a wrong number cannot be taken back.",
    { link: "/pay", actions: [PAY], followUps: ["How do I buy data?", "Can I pay from my wallet?", "My airtime did not arrive"] }),

  d("bills:data", "Buy data bundles (MTN, Airtel, Glo, 9mobile)",
    "To buy data: 1. Open Pay bills and choose Data. 2. Pick the network. 3. Type the phone number. 4. Choose a plan (daily, weekly, monthly and other groups are shown with their prices). 5. Tap Pay. " +
    "The price shown for each plan is the price you pay. The data is delivered to the number after payment, usually in seconds.",
    { link: "/pay", actions: [PAY], followUps: ["Can I pay from my wallet?", "How do I buy airtime?", "My data did not arrive"] }),

  d("bills:electricity", "Buy electricity (prepaid or postpaid meter)",
    "To buy electricity: 1. Open Pay bills and choose Electricity. 2. Pick your electricity company and whether your meter is prepaid or postpaid. 3. Type your meter number. We show the name on the meter so you can check it is right. 4. Enter the amount and your phone number, then pay. " +
    "For a prepaid meter the token is shown on the result page: type it into your meter. Always check the name before paying. A small service fee may be added to the amount and is shown before you pay.",
    { link: "/pay", actions: [PAY], followUps: ["Where do I see my token?", "How do I pay from my wallet?", "My token did not come"] }),

  d("bills:tv", "Pay for TV: DStv, GOtv, StarTimes, Showmax",
    "To pay for DStv, GOtv or StarTimes: 1. Open Pay bills and choose TV. 2. Pick the TV company. 3. Type the smartcard or decoder number. We show the name on the card so you can check it. 4. Choose a bouquet and pay. " +
    "For Showmax you only need your phone number: after payment you get a Showmax code on the result page. A small service fee may be added and is shown before you pay.",
    { link: "/pay", actions: [PAY], followUps: ["How do I use my Showmax code?", "Can I pay from my wallet?", "Can I set a renewal reminder?"] }),

  d("bills:exam", "Exam pins: WAEC result checker, WAEC GCE, WAEC registration, JAMB",
    "On the Pay page choose Exam pins. You can buy a WAEC result checker pin, a WAEC GCE pin, a WAEC registration pin and a JAMB pin. The serial number and PIN are shown on the result page after payment, so keep that page or note them down. " +
    "For JAMB you type your JAMB profile code first and we confirm it; one JAMB purchase per order. Other exams such as NECO are not available on the site.",
    { link: "/pay", actions: [PAY], followUps: ["How do I pay from my wallet?", "My pin did not show", "How do I buy data?"] }),

  d("bills:problem", "A bill purchase failed, is pending or did not arrive",
    "If airtime, data, an electricity token, TV payment or an exam pin did not arrive: 1. Open the result page again, it may still be processing for a minute. 2. Check you typed the right number. 3. Keep your reference (it starts with SC-VTU-). " +
    "If a purchase fails after you paid, the money is returned: for wallet payments it goes straight back to your wallet; for card or bank transfer payments our team refunds you. Talk to our team with your reference, or your phone number or email, and they can find the purchase quickly.",
    { link: "/pay", actions: [{ label: "Check my wallet", link: "/wallet" }], followUps: ["How do I talk to a person?", "Is my money safe?"] }),

  d("wallet:overview", "Smart Combo wallet: what it is and the rules",
    "Your Smart Combo wallet holds money you can spend on Smart Combo: bills and purchases on the site. You need to be signed in. The wallet is for spending only: money in the wallet cannot be withdrawn or sent to another person. " +
    "If a purchase paid from the wallet fails, the money goes straight back to your wallet, once. Referral earnings that we credit to you are also added to your wallet and appear in its history. Your balance shows on the Pay page and on the Wallet button in the bottom menu.",
    { link: "/wallet", actions: [WALLET], followUps: ["How do I add money?", "Can I withdraw my wallet?", "How do I pay from my wallet?"] }),

  d("wallet:fund", "How to add money to your wallet",
    "To add money: 1. Sign in and open Wallet. 2. Tap Add money. 3. Type the amount you want to add. 4. Pay on the secure Paystack page with your card, bank transfer or USSD. 5. You return to your Wallet and the new balance shows. " +
    "There is no limit on how much you can add. If you paid and the balance has not changed after a few minutes, keep your payment reference and talk to our team.",
    { link: "/wallet", actions: [WALLET], followUps: ["How do I pay from my wallet?", "Can I withdraw my wallet?", "Where do I see my history?"] }),

  d("wallet:pay", "How to pay for bills from your wallet",
    "To pay from your wallet: 1. Sign in. 2. Open Pay bills and fill in what you want to buy. 3. Tap Pay and choose Smart Combo wallet. 4. Confirm. The amount is taken from your balance and the purchase starts at once. " +
    "If your balance is too low the page tells you and you can add money. Paying from the wallet does not need a card.",
    { link: "/pay", actions: [PAY, WALLET], followUps: ["How do I add money?", "What if the purchase fails?", "Can I see my spending?"] }),

  d("account:signin", "Sign in to your Smart Combo account",
    "To sign in: 1. Open Account. 2. Type your email address. 3. We send a one-time code to that email (check your spam folder). 4. Type the code. New customers also add their name and phone number once. " +
    "After you sign in you go back to where you were, or to the Pay page. Never share your code with anyone, including us.",
    { link: "/account", actions: [SIGNIN], followUps: ["I did not get my code", "What is my wallet for?", "Where is my spending?"] }),

  d("account:spending", "My spending: see what you spent on bills",
    "My spending shows how much you have spent on bills (airtime, data, electricity, TV and exam pins), with a total and your recent purchases. Sign in, then open My spending from the Pay page or the Account page. Only successful purchases are counted.",
    { link: "/spending", actions: [SPENDING], followUps: ["How do I set a renewal reminder?", "How do I add money to my wallet?"] }),

  d("account:reminders", "Reminders: renew airtime, data, electricity or TV, and the low wallet alert",
    "After you buy airtime, data, electricity or TV, tap Remind me to renew on the result page and choose how often (every 7, 14, 30, 60 or 90 days). When it is time, a Due soon card appears on the Pay page and your Account page with a Buy again button that fills in the form for you. " +
    "On the Reminders page you can change the days, pause or delete a reminder, and set a low wallet alert so you are told when your wallet drops below an amount you choose. Reminders appear on the site; we never buy anything for you automatically.",
    { link: "/reminders", actions: [REMINDERS], followUps: ["How do I buy data?", "How do I add money to my wallet?"] }),

  d("shop:instalments", "Pay in instalments (pay small small)",
    "You can pay for some products in instalments. For items from \u20A610,000 to \u20A650,000 you pay in two or more payments within 30 days. For items from \u20A651,000 to \u20A6200,000 you pay in parts over 60 days. " +
    "The item is reserved for you from your first payment and is delivered after the full amount is paid. If you miss the deadline you can ask for 3 to 7 extra days; after that the plan ends and the item goes back on sale. Money paid in instalments is not refundable if you change your mind. " +
    "Your order page has a How to pay the rest later box with your payment link. Instalments are for single products and combos, not bulk orders or pre-order items.",
    { link: "/order-tracking", actions: [TRACK], followUps: ["How do I pay the next part?", "How does delivery work?", "What if I miss a payment?"] }),

  d("shop:bulk", "Bulk orders: buy more, pay less",
    "Some products show a Buy more, pay less box on the product page with a lower price when you buy more pieces. Bulk orders must be paid online (no cash on delivery). Delivery for a whole bulk order in Ilorin is a flat \u20A62,000. Outside Ilorin the order goes by Jumia and you pay Jumia directly. " +
    "If you want more pieces than we have in stock you can choose to receive what is ready now and the rest later, or wait and receive everything together. For a custom price, use Get a price on WhatsApp on the product page.",
    { link: "/products", actions: [{ label: "Shop products", link: "/products" }], followUps: ["What is your delivery fee?", "Can I pay in instalments?"] }),

  d("shop:preorder", "Pre-order items (not in stock yet)",
    "A product with no stock can be marked Pre-order. The product page shows how many business days it takes and the full-refund promise if we cannot supply it. You pay, then we buy the item for you and send it. Read the waiting time on the product page before you order.",
    { link: "/products", actions: [{ label: "Shop products", link: "/products" }], followUps: ["What is your delivery fee?", "How do I track my order?"] }),
];
