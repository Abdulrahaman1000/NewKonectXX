# Test: recharge wording
Install (PowerShell, project folder):

    $z = Get-ChildItem "$env:USERPROFILE\Downloads\smartcombo-vtu-terms*.zip" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    Expand-Archive $z.FullName -DestinationPath .\vtu-terms -Force
    node .\vtu-terms\patch-vtu-terms.mjs

1. Restart npm run dev, open /terms: new section "6c. Airtime, data and electricity" between Payment (6b) and Delivery (7).
2. Admin > FAQs: add the five Q&As from FAQ-recharge.txt (live FAQs are in the database, so do this on the live admin too).
3. These are my plain-language drafts, not legal advice. Have a Nigerian lawyer read 6c before real money moves, especially the no-refund-after-delivery line.
