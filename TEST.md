# Bulk orders, phase 1: install and test

## Install (PowerShell)
```powershell
cd "C:\Users\Systems Technologies\Downloads"
Expand-Archive .\smartcombo-bulk.zip -DestinationPath .\smartcombo-bulk -Force
Copy-Item .\smartcombo-bulk\* "C:\Users\Systems Technologies\NewKonectXX" -Recurse -Force
cd "C:\Users\Systems Technologies\NewKonectXX"
node .\patch-bulk.mjs
```
You should see "patched:" lines and "added:" lines. If it says "CANNOT PLACE", nothing was changed: send me that text.
Running it twice is safe ("already patched").

Then stop every node window and start ONE:
```powershell
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
npm run dev
```
(If Atlas says "IP not whitelisted", add your current IP in Atlas > Network Access first.)

## Test (about 10 minutes)
1. **Set bulk prices (admin).** Admin > Products > open your smart watch. Set Stock to 60. Under "Pricing & stock" you now see a **Bulk prices** box. Click "Add a price level" three times and enter: 10 pieces = 18500, 20 pieces = 17000, 50 pieces = 15000. Save.
   - Reopen the product: the three rows are still there.
   - Change one price to below your cost price: a **red warning** shows ("Selling below cost"). Put it back.
2. **Product page.** Open the product on the shop. You see **Buy more, pay less** with the price list.
   - 9 pieces shows the normal price. 10 shows 18,500 each. 20 shows 17,000 each and a total of 340,000.
   - Under the total you see the delivery words (Ilorin 2,000, elsewhere Jumia, paid online).
   - Type 100: it says "We have 60 ready. Please choose 60 or fewer, or get a price on WhatsApp." and the button is off.
   - "Get a price on WhatsApp" opens WhatsApp with the message filled in.
   - Check it on a phone-size window (press F12, phone icon) and on a wide window.
3. **Cart and checkout.** Choose 20, press "Add 20 pieces to cart".
   - Cart shows 17,000 each. Press minus until 9: price changes back to the normal price. Go back up to 10: 18,500.
   - Checkout with city **Ilorin**: delivery row says **Bulk delivery 2,000**. Only **Pay online** can be chosen. Cash on delivery, bank transfer and WhatsApp are greyed out. The green "Pay on Delivery" banner is hidden.
   - Change city to **Lagos**: delivery says "Paid to Jumia", no fee added.
   - Pay with the Paystack test card. Open the order in admin: items at 17,000 each, shipping 2,000 (Ilorin), the total is right.
4. **Normal orders unchanged.** Put 1 piece of the same product in the cart. Ilorin delivery is **1,000**, Pay on Delivery works. 9 pieces: still 1,000.
5. **Cost privacy (must print nothing).** Local and live:
```powershell
(Invoke-WebRequest http://localhost:8080/api/combos -UseBasicParsing).Content | Select-String "costPrice"
```
(use the port Vite printed)
6. **Staff.** Log in as a staff user (private window): the Bulk prices box is not shown, and saving a product does not remove the bulk prices.
7. **Regression:** run section 5b of the handover.

## What is not in this phase (on purpose)
- Pre-order items (phase 2), "send now or wait" for partial stock (phase 3). Until phase 3, asking for more than the stock shows the WhatsApp message instead.
- The Orders list "Bulk" tag (phase 4). The order is already saved as bulk in the database.
- Record a sale: bulk prices and the 2,000 delivery apply there too; if its quantity box stops at 20, tell me and I will lift it.

## Undo
Every changed file has a copy next to it ending in `.bak-bulk`. Copy it back over the file to undo.
