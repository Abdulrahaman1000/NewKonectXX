# Test: connecting accounts and recharge to the site

Install (PowerShell, project folder; accounts and VTU must already be installed):

    $z = Get-ChildItem "$env:USERPROFILE\Downloads\smartcombo-connect*.zip" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    Expand-Archive $z.FullName -DestinationPath .\connect -Force
    node .\connect\patch-connect.mjs

Restart `npm run dev`. Backups end in `.bak-conn`. Safe to run twice.

With `VTU_PROVIDER=simulator` in server\.env (laptop):
1. Desktop header: "Pay bills" after Home, and an account icon (with "Account" on wide screens) before Partner login.
2. Phone menu (three lines): "Pay bills (airtime, data, electricity)" and "My account".
3. Phone bottom bar: a "Pay" tab (card icon) between Build and Cart. It highlights on /pay. (Six tabs when recharge is on. Tell me if you want Cart replaced by Pay as in the first design.)
4. Home page: the "Recharge & pay bills" card under the hero on phone, and under the trust bar on desktop. Airtime, Data, Electricity open /pay on the right tab.
5. Sign in at /account: your recharge purchases appear under "Airtime, data and electricity". Orders there now open Track Order correctly.
6. Admin: /admin/vtu still opens for you; a staff login without owner rights is sent away.

With VTU switched OFF (remove the VTU_PROVIDER line, restart): no Pay link, no Pay tab, no home card. That is how the live site stays until a real provider is connected.

Live site: "My account" links stay hidden until you set VITE_SHOW_ACCOUNT=yes on Render and redeploy. Do that after the Resend domain is verified, so customers actually receive their sign-in codes.
