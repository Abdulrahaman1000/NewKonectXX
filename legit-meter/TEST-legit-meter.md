# Test: electricity (meter check)

    $z = Get-ChildItem "$env:USERPROFILE\Downloads\smartcombo-legit-meter*.zip" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    Expand-Archive $z.FullName -DestinationPath .\legit-meter -Force
    node .\legit-meter\patch-vtu-5.mjs

Restart `npm run dev` (VTU_PROVIDER=legitdataway and LEGIT_TOKEN already set).
1. /pay > Electricity: pick the company, prepaid or postpaid, type a REAL meter number, tap Verify: the account name appears. A wrong number says "We could not find that meter" and you cannot pay.
2. Pay a small amount (the minimum is N1,000, set in Admin). This spends your real Legitdataway balance. Expect a token on the result page you can copy, and the cost/profit in Admin.
3. Remember: the amount you set as the service fee (default N100) is added on top for the customer. Compare it with what Legitdataway charges you (their reply shows "charges"; Admin shows the cost read from your balance).
4. Still not available from their docs: a status lookup. A stuck electricity purchase is settled with Mark delivered / Mark failed and refund after checking Legitdataway > Transactions. Take care with electricity: a delivered token cannot be recalled.
