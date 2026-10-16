// Wires the AI chat into Smart Combo. Safe to run twice.
// Run from the project root:  node install-ai-chat.mjs
import fs from "node:fs";

const read = (p) => fs.readFileSync(p, "utf8");
const write = (p, s) => fs.writeFileSync(p, s, "utf8");
const nl = (s) => (s.includes("\r\n") ? "\r\n" : "\n");
let problems = 0;

function patch(file, steps) {
  if (!fs.existsSync(file)) { console.log(`✗ ${file} not found. Run this from the project root.`); problems++; return; }
  let src = read(file);
  const eol = nl(src);
  for (const s of steps) {
    if (src.includes(s.already)) { console.log(`• ${file}: ${s.label} (already done)`); continue; }
    if (!s.find.test(src)) { console.log(`✗ ${file}: could not find the place for "${s.label}"`); problems++; continue; }
    src = src.replace(s.find, (m) => s.make(m, eol));
    console.log(`✓ ${file}: ${s.label}`);
  }
  write(file, src);
}

patch("server/index.ts", [
  {
    label: "import AI router",
    already: 'from "./routes/ai"',
    find: /import chatRouter from "\.\/routes\/chat";/,
    make: (m, e) => `${m}${e}import aiRouter from "./routes/ai";`,
  },
  {
    label: "small body limit for /api/ai",
    already: '"/api/ai"',
    find: /([ \t]*)if \(req\.originalUrl === "\/api\/payments\/webhook\/paystack"\) return next\(\);/,
    make: (m, e) => {
      const ind = m.match(/^[ \t]*/)[0];
      return `${m}${e}${ind}if (req.originalUrl.startsWith("/api/ai")) return express.json({ limit: "20kb" })(req, res, next);`;
    },
  },
  {
    label: "mount /api/ai",
    already: 'app.use("/api/ai"',
    find: /app\.use\("\/api\/chat", chatRouter\);/,
    make: (m, e) => `${m}${e}  app.use("/api/ai", aiRouter);`,
  },
]);

patch("client/App.tsx", [
  {
    label: "import AIChatLauncher",
    already: "AIChatLauncher }",
    find: /import \{ WhatsAppFloat \} from '@\/components\/shared\/WhatsAppFloat';/,
    make: () => "import { AIChatLauncher } from '@/components/AIChatLauncher';",
  },
  {
    label: "replace the WhatsApp button with the AI launcher",
    already: "<AIChatLauncher />",
    find: /<WhatsAppFloat \/>/,
    make: () => "<AIChatLauncher />",
  },
]);

// Add the setting names to .env (no values; you paste your key yourself)
const envFile = ".env";
let env = fs.existsSync(envFile) ? read(envFile) : "";
const e = nl(env || "\n");
let added = [];
for (const k of ["GEMINI_API_KEY", "GEMINI_MODEL", "AI_DAILY_LIMIT"]) {
  if (!new RegExp(`^\\s*${k}\\s*=`, "m").test(env)) { env += (env && !env.endsWith("\n") ? e : "") + `${k}=${e}`; added.push(k); }
}
if (added.length) { write(envFile, env); console.log(`✓ .env: added empty ${added.join(", ")}`); }
else console.log("• .env: names already there");

console.log(problems ? `\n${problems} problem(s). Send me the lines marked ✗.` : "\nDone. Next: put your Gemini key in .env, then run npm run dev.");
