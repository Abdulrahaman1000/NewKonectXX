# Legitdataway provider: install and test

Install (PowerShell, project folder; the VTU, connect, plans updates must be installed):

    $z = Get-ChildItem "$env:USERPROFILE\Downloads\smartcombo-legitdataway*.zip" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    Expand-Archive $z.FullName -DestinationPath .\legit -Force
    node .\legit\patch-vtu-4.mjs

## 1. Regenerate your API token first
Your token appeared in screenshots sent in chat. At Legitdataway change your password / regenerate the token, and use the NEW one below. Never paste it in chat or commit it.

## 2. Import your data plans (165 plans are not available through the API, so we copy them once)
1. Legitdataway > Pricing > the "Data Plans" table. Set "Rows per page" to the biggest option so all 165 rows show (or copy page by page and join the text).
2. Select the table rows (header row optional), copy, paste into a new file `legit-plans.txt` in the project folder.
3. Run `node scripts\legit-plans-import.mjs legit-plans.txt`. It prints how many plans it saved per network and any lines it could not read. If it skips lines, send me those lines.
4. This creates `server\services\vtu\legitPlans.json`. Commit it (it is not a secret) so Render has the plans. Re-run it any time Legitdataway changes prices, then redeploy.

## 3. Set the token (local first)
In `server\.env` (check the ROOT .env does not set VTU_PROVIDER, the root file wins):

    VTU_PROVIDER=legitdataway
    LEGIT_TOKEN=<your NEW token>

(or LEGIT_USERNAME and LEGIT_PASSWORD instead of the token). Restart `npm run dev`. The yellow "Test mode" note disappears: **this is real money now**. Paystack is still on TEST keys, so customers pay nothing real but each purchase still spends your Legitdataway balance. Keep your balance small while testing.

## 4. Tests (use your own number)
1. Admin > Airtime, data, electricity > Plans and prices: your Legitdataway plans appear (cost = their price). Set your own selling prices (rule default is cost +5%).
2. /pay > Airtime, MTN (or your network), your number, N100, pay with a Paystack test card. Expect "Done!" and the airtime arrives. Admin shows cost (read from the balance change), profit and a request id.
3. /pay > Data: the cheapest plan on your own number. Expect it delivered.
4. Failure test (safe): airtime N100 to a deliberately wrong number like 08000000000 or too short is refused before payment. If Legitdataway refuses after payment, the page says it failed and the refund starts (Admin > Refunds).
5. Electricity: NOT available yet (the meter check is not set up). /pay > Electricity will say it is not available. Send me the "Verify METER" page of the documentation and I will switch it on.
6. If a purchase ever shows "processing" for long: Admin > Needs attention. Open Legitdataway > Transactions. If it was delivered press **Mark delivered**; if not, press **Mark failed and refund**. (Legitdataway's documentation shows no status lookup call; ask their support whether one exists.)

## What I could not confirm from their documentation (I fail safe on each)
- Meter verification call: electricity stays off.
- A status lookup by request id: none shown; stuck purchases are settled by you using Mark delivered / Mark failed.
- The exact words of a failed or pending reply: only status "success" counts as success; clear failures are refunded; anything unclear is held for you, never refunded automatically and never retried.
- Whether Legitdataway refuses a repeated request-id (their tip says it prevents duplicate purchases). We never re-send a purchase.
- Provider balance: when your Legitdataway balance runs out, purchases fail and customers are refunded. Keep it funded. Balance alerts are not built.
