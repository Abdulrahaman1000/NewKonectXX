// Reads the text of your website pages and saves it for the AI assistant.
// Run from the project root:  node build-site-knowledge.mjs
// Re-run it whenever you change those pages, then commit server/ai/siteContent.json.

import fs from "node:fs";
import path from "node:path";
import * as tsNs from "typescript";
const ts = tsNs.default ?? tsNs; // works with every TypeScript version
if (!ts.ScriptTarget) {
  console.error("This needs the TypeScript 5 package that your project already has. Run npm install (or pnpm install) first, then try again.");
  process.exit(1);
}

const PAGES = [
  { file: "client/pages/Shipping.tsx", id: "shipping", title: "Shipping information", link: "/shipping" },
  { file: "client/pages/Returns.tsx", id: "returns", title: "Returns and refunds", link: "/returns" },
  { file: "client/pages/Privacy.tsx", id: "privacy", title: "Privacy policy", link: "/privacy" },
  { file: "client/pages/Terms.tsx", id: "terms", title: "Terms of service", link: "/terms" },
  { file: "client/pages/Contact.tsx", id: "contact", title: "Contact page", link: "/contact" },
  { file: "client/sections/WhyChooseUs.tsx", id: "why", title: "Why choose Smart Combo", link: "/" },
];

// Attributes whose text is never something a customer reads
const SKIP_ATTR = new Set([
  "className", "class", "style", "to", "href", "src", "srcSet", "alt", "key", "id", "type", "name",
  "target", "rel", "role", "variant", "size", "width", "height", "viewBox", "d", "fill", "stroke",
  "xmlns", "loading", "decoding", "htmlFor", "autoComplete", "inputMode", "placeholder",
]);

function looksLikeCode(t) {
  if (/^(https?:|\/|#|\.\/|@\/|[a-z]+:\/\/)/i.test(t)) return true; // links and paths
  if (/^[\w.-]+\.(png|jpe?g|svg|webp|gif|mp4|css|tsx?|json)$/i.test(t)) return true;
  const words = t.split(/\s+/);
  const classy = words.filter((w) => /^[a-z0-9!:\[\]\/%.#()_-]+$/.test(w) && /[-:\[\]\/]/.test(w)).length;
  if (words.length > 1 && classy / words.length > 0.5 && !/[.!?,]/.test(t)) return true; // tailwind classes
  if (/^[A-Z_]{3,}$/.test(t)) return true; // CONSTANTS
  return false;
}

function extract(source, fileName) {
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out = [];
  const seen = new Set();
  const add = (raw) => {
    const t = raw.replace(/\s+/g, " ").trim();
    if (t.length < 3 || seen.has(t) || looksLikeCode(t)) return;
    seen.add(t);
    out.push(t);
  };
  const insideSkipped = (node) => {
    for (let p = node.parent; p; p = p.parent) {
      if (ts.isJsxAttribute(p) && SKIP_ATTR.has(p.name.getText(sf))) return true;
      if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p)) return true;
      if (ts.isLiteralTypeNode(p) || ts.isTypeNode(p)) return true;
      if (ts.isCallExpression(p) && /^(cn|clsx|twMerge|cva|import|require)$/.test(p.expression.getText(sf))) return true;
      if (ts.isPropertyAssignment(p) && /^(icon|className|color|bg|gradient|image|img|href|to|path|src)$/i.test(p.name.getText(sf)) && p.initializer === node) return true;
    }
    return false;
  };
  (function visit(node) {
    if (ts.isJsxText(node)) add(node.getText(sf));
    else if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && !insideSkipped(node)) {
      // short values in data tables ({ place: 'Ilorin', time: '2-3 days' }) still carry meaning
      const inTable = ts.isPropertyAssignment(node.parent) && /[A-Za-z]{3,}/.test(node.text);
      if (node.text.length >= 12 || /\s/.test(node.text) || inTable) add(node.text);
    }
    ts.forEachChild(node, visit);
  })(sf);
  return out;
}

const result = [];
let warnings = [];
for (const page of PAGES) {
  if (!fs.existsSync(page.file)) { console.log(`- ${page.file}: not found, skipped`); continue; }
  const lines = extract(fs.readFileSync(page.file, "utf8"), page.file);
  if (!lines.length) { console.log(`- ${page.file}: no readable text found`); continue; }
  result.push({ id: page.id, title: page.title, link: page.link, text: lines.join("\n") });
  console.log(`✓ ${page.file}: ${lines.length} lines, ${lines.join(" ").length} characters`);
  for (const l of lines) {
    if (/\bfree\b/i.test(l) && /deliver|shipping/i.test(l)) warnings.push(`${page.file}: "${l}"`);
  }
}

fs.mkdirSync("server/ai", { recursive: true });
fs.writeFileSync(path.join("server", "ai", "siteContent.json"), JSON.stringify(result, null, 2), "utf8");
console.log(`\nSaved ${result.length} page(s) to server/ai/siteContent.json`);

if (warnings.length) {
  console.log("\n⚠ These lines promise FREE delivery. Checkout charges a delivery fee (except cash on delivery in your COD cities).");
  console.log("  The AI will quote the checkout rule, so decide which is right and fix the page or the setting:");
  warnings.forEach((w) => console.log("  - " + w));
}
console.log("\nCheck the saved file: every price, number of days and percentage in it must be current.");
