# Test: customer accounts (email code sign-in)

Install (PowerShell, from the project folder):
    $z = Get-ChildItem "$env:USERPROFILE\Downloads\smartcombo-accounts*.zip" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    Expand-Archive $z.FullName -DestinationPath .\accounts -Force
    node .\accounts\patch-accounts.mjs
Then restart `npm run dev`. Backups end in `.bak-acct`. Safe to run twice.

On your laptop the code is **printed in the server window** ("Smart Combo login code for ...") and also emailed if RESEND_API_KEY is set. Until the Resend domain is verified, the email reaches only walex1257@gmail.com.

1. Open http://localhost:8081/account. You see "Sign in" with one email box.
2. Type a bad email (abc). Expect "valid email" message.
3. Type your email, tap Send me a code. Copy the 6 digits from the server window (or your inbox).
4. Type a wrong code: "That code is not right". Type the right one: you are in.
5. First time only: it asks for name and phone. Fill both. You land on "Hello, <name>".
6. Orders placed with the SAME email at checkout are listed. An older order (or one with no email) can be added with order number + the phone used on it. A wrong phone says "could not find that order".
7. An instalment order shows "Instalments: N paid. Tap to pay the rest." and opens Track Order.
8. Refresh the page: still signed in. Sign out, then back to step 3.
9. Limits: asking for a second code within 45 seconds is refused; 5 wrong tries lock the code; 6 codes per hour per email.
10. The admin login still works as before (customer tokens are signed with a different secret and cannot open the admin).

Not in this update: a "My account" link in the header (send me client/components/Header.tsx and I add it), phone shown at checkout from the account, VTU.
