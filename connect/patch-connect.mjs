// SC-CONNECT: puts My account and Pay bills into the header, the phone menu and bottom bar, and the Recharge card on the home page.
// Also fixes the order link in /account and makes the admin VTU page owner-only. Run from the project folder, after accounts and VTU.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = process.cwd();
const here = path.dirname(fileURLToPath(import.meta.url));
const NEW_FILES = ["client/hooks/useVtuEnabled.ts", "client/components/RechargeCard.tsx", "client/api/vtu.ts", "client/pages/Account.tsx"];
const die = (m) => { console.error("\n" + m + "\nNothing was changed."); process.exit(1); };
const rd = (f) => fs.readFileSync(path.join(root, f), "utf8");
const has = (f) => fs.existsSync(path.join(root, f));

for (const f of ["client/pages/Pay.tsx", "client/pages/Account.tsx", "server/services/vtuService.ts"]) if (!has(f)) die(`Cannot find ${f}. Install the accounts and VTU updates first.`);
for (const f of ["client/components/Header.tsx", "client/components/MobileBottomNav.tsx", "client/pages/Index.tsx", "client/App.tsx"]) if (!has(f)) die(`Cannot find ${f}. Run this from the project folder.`);
for (const f of NEW_FILES) if (!fs.existsSync(path.join(here, "files", f))) die(`The package is missing files/${f}. Unzip the whole zip first.`);

const plan = [];
/** ops: {at:'after'|'before'|'replace', find:(line)=>bool, lines:[...], shift?:n}. Each must match exactly one line. */
function edit(file, doneIf, ops) {
  const src = rd(file);
  if (src.includes(doneIf)) { console.log("Already edited: " + file); return; }
  const eol = src.includes("\r\n") ? "\r\n" : "\n";
  const lines = src.split(/\r?\n/);
  const jobs = ops.map((o) => {
    const hits = lines.map((l, i) => (o.find(l) ? i : -1)).filter((i) => i >= 0);
    if (hits.length !== 1) die(`Cannot edit ${file} (${o.label}): expected 1 matching line, found ${hits.length}.`);
    return { ...o, i: hits[0] };
  });
  jobs.sort((a, b) => b.i - a.i); // bottom first so earlier line numbers stay valid
  for (const j of jobs) {
    const i = j.i + (j.shift ?? 0);
    if (j.at === "replace") lines.splice(j.i, 1, ...j.lines);
    else if (j.at === "after") lines.splice(i + 1, 0, ...j.lines);
    else lines.splice(i, 0, ...j.lines);
  }
  plan.push({ file, out: lines.join(eol) });
}
const re = (r) => (l) => r.test(l);

// ---- Header ----
edit("client/components/Header.tsx", "useVtuEnabled", [
  { label: "icons", at: "replace", find: re(/^import \{ ChevronDown, Menu, Search, ShoppingCart, Sparkles, X \} from 'lucide-react';\s*$/),
    lines: ["import { ChevronDown, CreditCard, Menu, Search, ShoppingCart, Sparkles, User, X } from 'lucide-react';"] },
  { label: "hook import", at: "after", find: re(/^import Logo from '@\/components\/shared\/Logo';\s*$/),
    lines: ["import { showAccountLinks, useVtuEnabled } from '@/hooks/useVtuEnabled';"] },
  { label: "hook", at: "after", find: re(/^\s*const storeName = settings\?\.storeName \?\? 'Smart Combo';\s*$/), lines: ["  const vtuOn = useVtuEnabled();"] },
  { label: "desktop pay link", at: "after", shift: 1, find: re(/^\s*Home\s*$/),
    lines: [
      "            {vtuOn && (",
      "              <Link to=\"/pay\" className=\"text-sm font-medium text-foreground/80 hover:text-primary transition-colors\">",
      "                Pay bills",
      "              </Link>",
      "            )}",
    ] },
  { label: "desktop account link", at: "before", shift: -1, find: re(/^\s*to="\/partner"\s*$/),
    lines: [
      "            {showAccountLinks && (",
      "              <Link to=\"/account\" aria-label=\"My account\" className=\"inline-flex items-center gap-1.5 text-sm font-medium text-foreground/80 hover:text-primary transition-colors\">",
      "                <User className=\"w-4 h-4\" />",
      "                <span className=\"hidden xl:inline\">Account</span>",
      "              </Link>",
      "            )}",
    ] },
  { label: "mobile menu", at: "after", find: re(/^\s*<Link to="\/order-tracking" onClick=\{toggleMenu\} className="block py-2 text-sm">Track Order<\/Link>\s*$/),
    lines: [
      "            {vtuOn && (",
      "              <Link to=\"/pay\" onClick={toggleMenu} className=\"flex items-center gap-1.5 py-2 text-sm font-bold text-primary\">",
      "                <CreditCard className=\"w-3.5 h-3.5\" />",
      "                Pay bills (airtime, data, electricity)",
      "              </Link>",
      "            )}",
      "            {showAccountLinks && <Link to=\"/account\" onClick={toggleMenu} className=\"block py-2 text-sm\">My account</Link>}",
    ] },
]);

// ---- Bottom bar ----
edit("client/components/MobileBottomNav.tsx", "useVtuEnabled", [
  { label: "icons", at: "replace", find: re(/^import \{ Home, LayoutGrid, MessageCircle, ShoppingBag, Sparkles \} from 'lucide-react';\s*$/),
    lines: ["import { CreditCard, Home, LayoutGrid, MessageCircle, ShoppingBag, Sparkles } from 'lucide-react';"] },
  { label: "hook import", at: "after", find: re(/^import \{ useChatUnread \} from '@\/hooks\/useChatUnread';\s*$/),
    lines: ["import { useVtuEnabled } from '@/hooks/useVtuEnabled';"] },
  { label: "hook", at: "after", find: re(/^\s*const chatUnread = useChatUnread\(isMobile && !chatOpen\);\s*$/), lines: ["  const vtuOn = useVtuEnabled();"] },
  { label: "pay tab", at: "before", find: re(/^\s*<button type="button" onClick=\{openCart\} className=\{ITEM\} aria-label="Open cart">\s*$/),
    lines: [
      "        {vtuOn && (",
      "          <Link to=\"/pay\" className={ITEM}>",
      "            <Tab active={pathname.startsWith('/pay')}>",
      "              <CreditCard className=\"w-6 h-6\" />",
      "              Pay",
      "            </Tab>",
      "          </Link>",
      "        )}",
      "",
    ] },
]);

// ---- Home page ----
edit("client/pages/Index.tsx", "RechargeCard", [
  { label: "import", at: "after", find: re(/^import \{ Sparkles \} from 'lucide-react';\s*$/), lines: ["import { RechargeCard } from '@/components/RechargeCard';"] },
  { label: "mobile card", at: "after", find: re(/^\s*<MobileHero featuredCombo=\{featuredCombo \?\? null\} combos=\{combos\} \/>\s*$/),
    lines: ["          <div className=\"section-padding py-3\"><RechargeCard /></div>"] },
  { label: "desktop card", at: "after", find: re(/^\s*<TrustBar \/>\s*$/),
    lines: ["          <div className=\"section-padding py-4\"><div className=\"container-premium\"><RechargeCard /></div></div>"] },
]);

// ---- App.tsx: admin VTU page owner only ----
{
  const f = "client/App.tsx"; const s = rd(f);
  const a = '<AdminProtectedRoute><AdminVtu />'; const b = '<AdminProtectedRoute perm="owner"><AdminVtu />';
  if (s.includes(b)) console.log("Already edited: " + f);
  else if (s.split(a).length !== 2) die("Cannot edit client/App.tsx (admin VTU route): expected 1 match.");
  else plan.push({ file: f, out: s.replace(a, b) });
}

// ---- write ----
for (const f of NEW_FILES) {
  const dest = path.join(root, f);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (fs.existsSync(dest)) fs.copyFileSync(dest, dest + ".bak-conn");
  fs.copyFileSync(path.join(here, "files", f), dest);
  console.log("Wrote " + f);
}
for (const p of plan) {
  const full = path.join(root, p.file);
  fs.copyFileSync(full, full + ".bak-conn");
  fs.writeFileSync(full, p.out);
  console.log("Edited " + p.file);
}
console.log("\nDone. Restart npm run dev. Steps in TEST-connect.md.");
