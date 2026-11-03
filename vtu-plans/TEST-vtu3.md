# Test: Plans and prices (VTU admin)

Install (PowerShell, project folder; VTU and connect updates must be installed):

    $z = Get-ChildItem "$env:USERPROFILE\Downloads\smartcombo-vtu-plans*.zip" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    Expand-Archive $z.FullName -DestinationPath .\vtu-plans -Force
    node .\vtu-plans\patch-vtu-3.mjs

Restart `npm run dev`. Backups end in `.bak-vtu3`. This replaces the VTU files from the earlier updates (no changes of yours are lost unless you edited them by hand).
On Render, after deploying, the same VTU_PROVIDER / VTU_ALLOW_SIMULATOR test variables are needed to see plans.

Open Admin > Airtime, data, electricity. Scroll to **Plans and prices**:
1. Pick a network. Plans are grouped Daily / Weekly / Monthly, each with the provider's cost, the rule price, the price customers pay and your profit.
2. Type "My price" on one plan, Save. Open /pay > Data on another tab: the new price shows. Pay for it in test mode: Paystack charges that exact price.
3. Type a price below the cost: the row shows a red "Loss N...". It is allowed (for a promo) but flagged.
4. Add a Label (e.g. "2GB best seller"), Save: customers see the label.
5. Press Hide: the plan disappears from /pay and cannot be bought. Show brings it back. Reset puts a plan back to the rule.
6. Untick a network (or an electricity company) and press Save under "Prices and limits": it disappears from /pay and cannot be bought. Tick it again and Save to restore.
7. When a real provider replaces the simulator, plans that the new provider does not have show "The provider no longer has this plan" and are never sold.

Not included: your own custom plans that the provider does not list, airtime price per network, ordering plans by hand. Say if you want them.
