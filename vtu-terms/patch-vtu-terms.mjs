// SC-VTUTERMS: adds a "Airtime, data and electricity" section to the Terms page (6c). Run from the project folder.
import fs from "node:fs";
import path from "node:path";

const f = path.join(process.cwd(), "client/pages/Terms.tsx");
if (!fs.existsSync(f)) { console.error("Cannot find client/pages/Terms.tsx. Run this from the project folder.\nNothing was changed."); process.exit(1); }
const src = fs.readFileSync(f, "utf8");
if (src.includes("6c. Airtime, data and electricity")) { console.log("Already edited: client/pages/Terms.tsx"); process.exit(0); }
const eol = src.includes("\r\n") ? "\r\n" : "\n";
const lines = src.split(/\r?\n/);
const hits = lines.map((l, i) => (/^\s*<h2>7\. Delivery<\/h2>\s*$/.test(l) ? i : -1)).filter((i) => i >= 0);
if (hits.length !== 1) { console.error(`Cannot find the "7. Delivery" heading exactly once (found ${hits.length}).\nNothing was changed.`); process.exit(1); }
const block = `      <h2>6c. Airtime, data and electricity</h2>
      <p>
        You can buy airtime, data bundles and electricity on our Pay page. You pay for each purchase online, through Paystack, and we then send it to the phone
        number or meter you gave us. We do not keep a wallet or balance for you. The price you see before you pay is the price you are charged.
      </p>
      <p>
        You are responsible for the network, phone number, meter number, meter type and amount you enter. Please check them before you pay. Airtime, data and
        electricity that has been delivered to the number or meter you entered cannot be taken back or refunded, including when it was sent to a wrong number
        or the wrong network.
      </p>
      <p>
        If a purchase fails and nothing is delivered, we refund the full amount to the card or account you paid with. Refunds go through Paystack and can take a
        few working days to reach you. If a purchase is slow, please wait and do not pay again: we check its status with our supplier, and if it was not
        delivered it is refunded. Delivery times depend on the network or electricity company and are not guaranteed. Electricity tokens are shown on the
        result page once the purchase is successful; keep your token and reference.
      </p>
      <p>
        Airtime, data and electricity purchases do not count towards the free gift offer, cannot be paid in instalments, and cannot be paid by cash on delivery.
        We may pause or stop any of these services at any time, for example when our supplier or a network is not available.
      </p>
`.split("\n");
lines.splice(hits[0], 0, ...block.slice(0, -1), "");
fs.copyFileSync(f, f + ".bak-vtuterms");
fs.writeFileSync(f, lines.join(eol));
console.log("Edited client/pages/Terms.tsx");
console.log("Done. Restart npm run dev and open /terms. Then add the FAQ answers (FAQ-recharge.txt) in Admin > FAQs.");
