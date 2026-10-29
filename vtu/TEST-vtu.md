# Test: VTU (airtime, data, electricity), pay per purchase, no wallet

Needs the accounts update installed first (smartcombo-accounts.zip). Install both parts from the project folder:

    $z = Get-ChildItem "$env:USERPROFILE\Downloads\smartcombo-vtu*.zip" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    Expand-Archive $z.FullName -DestinationPath .\vtu -Force
    node .\vtu\patch-vtu-1.mjs
    node .\vtu\patch-vtu-2.mjs

Backups end in `.bak-vtu`. Safe to run twice.

## Switch it on (laptop only)
Add this line to `server\.env` (and check the ROOT `.env` does not already have a different VTU_PROVIDER, the root file wins):

    VTU_PROVIDER=simulator

Restart `npm run dev`. The simulator is a pretend provider: nothing real is sent and no money moves out. **Do NOT put this on Render.** Without the line (or with it unset) the live site shows "Recharge is coming soon" and refuses purchases. Even if you add it on Render by mistake it is ignored unless you also set VTU_ALLOW_SIMULATOR=yes.

Paystack is still your TEST keys. Use a Paystack test card. On a laptop the Paystack webhook cannot reach you, so the result page asks Paystack itself (that is how it works here).

## Tests (http://localhost:8081/pay)
1. A yellow "Test mode" note shows. Tabs: Airtime, Data, Electricity, TV (TV says soon and cannot be pressed).
2. **Airtime**: pick MTN, type 0803 111 2222, tap N1,000, type an email. The button says "Pay N1,000". Pay with the test card. You land on the result page: "Done!" within a few seconds.
3. **Data**: pick Weekly, choose 2 GB. The button shows the price. Pay, "Done!".
4. **Electricity**: choose a company, Prepaid, meter 12345678901, tap Verify (you see TEST CUSTOMER), tap N5,000. Button says N5,100 (N100 fee). Pay: the result page shows a token you can copy.
5. **Failed purchase (refund)**: airtime to 08030000000 (ends 0000), pay. Result: "We could not complete it ... refund". In Paystack (test dashboard) the payment shows a refund. Admin > Airtime, data, electricity > Refunds shows it.
6. **Slow purchase**: number ending 9999: "Sending it now..." then turns to Done by itself.
7. **Unknown result**: number ending 1111: stays "Sending it now", then turns Done after the next check. It must never be bought twice (Admin shows 1 attempt).
8. **Bad meter**: meter ending 0000: "could not find that meter".
9. **Not paid**: start a purchase, close Paystack without paying. Nothing is delivered. Admin > Not paid lists it.
10. **Admin page** (dashboard tile "Airtime, data, electricity"): sales, profit, delivered, needs attention; filters; Check status, Retry refund, Mark refunded, Mark failed and refund (only for a stuck purchase). Change a price in "Prices and limits", Save, reload /pay: data prices change. Tick "Pause all recharge sales": /pay says coming soon.
11. Staff accounts (packer, sales) cannot open /api/admin/vtu (owner only).
12. A customer signed in at /account who buys with the same email will have the purchases saved to their history (shown later in My account).

## Prices (set before going live)
Airtime is sold at face value; your profit is the provider's discount (default 2%, edit it). Data = provider price + 5% (edit it). Electricity = amount + N100 fee. These defaults are guesses: set them from your provider's real price list.

## Before real money (not done yet)
- Connect a real provider: ClickPay (https://clickpay.com.ng/api) or another. Write one adapter file (server/services/vtu/provider.ts describes it), set VTU_PROVIDER. Send me their API documentation and a test key and I will write it.
- Fund the provider account. You pay the provider from your balance the moment a customer buys; Paystack pays you the next business day.
- Live Paystack keys and webhook (so payments are counted even if the customer closes the page).
- Not built yet: TV, receipts by email (waits for Resend), the "Recharge & pay bills" card on the home page (component client/components/RechargeCard.tsx is ready; send me your home page file, or add <RechargeCard /> where you want it and import it), a Terms/FAQ page for recharge.
