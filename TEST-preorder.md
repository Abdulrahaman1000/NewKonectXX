# Bulk orders, phase 2: pre-order. Install and test

Install phase 1 first (smartcombo-bulk.zip, `node .\patch-bulk.mjs`). Then:

## Install (PowerShell)
```powershell
cd "C:\Users\Systems Technologies\Downloads"
Expand-Archive .\smartcombo-preorder.zip -DestinationPath .\smartcombo-preorder -Force
Copy-Item .\smartcombo-preorder\* "C:\Users\Systems Technologies\NewKonectXX" -Recurse -Force
cd "C:\Users\Systems Technologies\NewKonectXX"
node .\patch-preorder.mjs
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
npm run dev
```
You should see "patched:" and "added:" lines. If you see "CANNOT PLACE", nothing was changed: send me that text.
A line starting with "!" means an optional edit (dashboard tile or shop card) was skipped safely.

## Test (about 10 minutes)
1. **Switch it on (admin).** Admin > Products > open a product. Set **Stock to 0**. Find the new **Pre-order** box, tick "Sell it even when there is no stock", set waiting time 5 to 10 business days. Save. Reopen: it stayed on.
2. **Product page (phone size and wide).** You see a gold **Pre-order** notice: "We get this item for you after you pay. It arrives in 5 to 10 business days. If we cannot get it, you get your money back." The button says **Pre-order now** (not "Out of stock"). The shop card for the product also says Pre-order now.
   - If the product also has bulk prices, the bulk box shows "Pre-order 10 pieces" and the same notice.
3. **Checkout.** Add it to the cart and open checkout.
   - A gold box says "Some items are pre-order" with the tick box "I understand some items are pre-order."
   - Cash on delivery, bank transfer and WhatsApp are greyed out. Only Pay online works.
   - Press Pay without ticking: a message asks you to tick the box.
   - Tick it and pay with the Paystack test card.
4. **To get page.** Admin dashboard > **To get** (or /admin/to-get). You see the order, "Buy these: Product x N pieces", and a promised-by date.
   - Open **Fulfilment**: this order is **not** in "To pack" yet.
   - Back on To get, press **Got it**. Now it appears in Fulfilment > To pack and can be packed and shipped as usual.
5. **Stock unchanged.** The product stock is still 0 after the pre-order (it never goes below 0).
6. **Cancel/refund.** Place another pre-order, then cancel or refund it in the order page: stock stays 0 (nothing to put back).
7. **Not a pre-order:** a product with the switch OFF and stock 0 still says Out of stock. A pre-order product that HAS stock sells normally (no notice).
8. **Mixed cart:** one in-stock product plus one pre-order product: the in-stock one loses stock, the pre-order one does not, and the order waits on To get until you press Got it.
9. **Record a sale** (WhatsApp) of a pre-order product: it saves (no tick needed) and also waits on To get.
10. Cost privacy check and the section 5b regression list.

## Not in this phase
- If stock is some but not enough (want 20, have 8): the customer is told "only 8 ready". The "send now or wait" choice is phase 3.
- Fulfilment tabs and the Orders list tags (phase 4); customer tracking by parts (phase 5).
- The packer never sees pre-order orders until you press Got it.

## Undo
Every changed file has a copy next to it ending in `.bak-preorder`. Copy it back over the file.
