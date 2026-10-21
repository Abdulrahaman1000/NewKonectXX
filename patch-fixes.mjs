import fs from 'fs';
const f = 'client/pages/AdminOrderDetail.tsx';
if (!fs.existsSync(f)) { console.log('Run this from the project root (NewKonectXX). Not found: ' + f); process.exit(1); }
const raw = fs.readFileSync(f, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
let s = raw.replace(/\r\n/g, '\n');
if (s.includes('Paid to Jumia')) { console.log('already patched: ' + f); process.exit(0); }
const a = "value={order.shippingFee === 0 ? 'Free' : formatNaira(order.shippingFee)}";
if (s.split(a).length !== 2) { console.log('ANCHOR NOT FOUND, nothing changed: ' + f); process.exit(1); }
const b = "value={order.shippingFee === 0 ? (String(order.shipping?.street ?? '').startsWith('Pickup') ? 'Pickup (no delivery)' : 'Paid to Jumia') : formatNaira(order.shippingFee)}";
fs.copyFileSync(f, f + '.bak-fixes');
fs.writeFileSync(f, s.replace(a, b).replace(/\n/g, eol));
console.log('patched: ' + f);
