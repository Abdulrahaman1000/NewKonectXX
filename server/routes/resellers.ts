/**
 * POST /api/resellers/register — save a partner application as "pending".
 *
 * Mount it in server/index.ts, AFTER express.json():
 *   import resellersRouter from './routes/resellers';
 *   app.use('/api/resellers', resellersRouter);
 */

import { Router } from 'express';
import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';
import { Reseller } from '../models/Reseller';
import { sendPartnerApplicationReceived } from '../services/emailService';

const router = Router();
const scrypt = promisify(scryptCallback);

/**
 * Password hashing with Node's built-in scrypt, so no extra package is needed.
 * Stored as "scrypt$<salt>$<hash>". When you build reseller login, hash the typed
 * password with the same salt and compare with crypto.timingSafeEqual.
 */
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
}

const PHONE_RE = /^\+?\d{10,15}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ACCOUNT_RE = /^\d{10}$/;

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const phoneOf = (v: unknown) => text(v, 30).replace(/[\s-]/g, '');

/** Simple per-IP limit: 5 applications per hour, so bots cannot flood the partner list. */
const attempts = new Map<string, { n: number; reset: number }>();
function tooMany(ip: string | undefined): boolean {
  const key = ip ?? 'unknown';
  const now = Date.now();
  const cur = attempts.get(key);
  if (!cur || now > cur.reset) {
    attempts.set(key, { n: 1, reset: now + 60 * 60 * 1000 });
    return false;
  }
  cur.n += 1;
  return cur.n > 5;
}

router.post('/register', async (req, res) => {
  const body = req.body ?? {};

  if (tooMany(req.ip)) {
    return res.status(429).json({ error: 'Too many applications from this connection. Please try again later.' });
  }

  // Honeypot: real people never fill this in. Answer "ok" so bots learn nothing.
  if (text(body.website, 100)) return res.status(201).json({ ok: true });

  const fullName = text(body.fullName, 100);
  const phone = phoneOf(body.phone);
  const whatsapp = phoneOf(body.whatsapp) || phone;
  const email = text(body.email, 150).toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';
  const channel = text(body.channel, 200);
  const bankName = text(body.bankName, 80);
  const accountNumber = text(body.accountNumber, 20).replace(/\D/g, '');
  const accountName = text(body.accountName, 100);

  if (fullName.length < 2) return res.status(400).json({ error: 'Please enter your full name.' });
  if (!PHONE_RE.test(phone)) return res.status(400).json({ error: 'Please enter a valid phone number.' });
  if (!PHONE_RE.test(whatsapp)) return res.status(400).json({ error: 'Please enter a valid WhatsApp number.' });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  if (password.length < 8 || password.length > 128) {
    return res.status(400).json({ error: 'Your password must be 8 to 128 characters.' });
  }
  if (bankName.length < 2) return res.status(400).json({ error: 'Please enter your bank name.' });
  if (!ACCOUNT_RE.test(accountNumber)) {
    return res.status(400).json({ error: 'Your account number must be 10 digits.' });
  }
  if (accountName.length < 2) return res.status(400).json({ error: 'Please enter your account name.' });

  const duplicate = { error: 'A partner with this email or phone number already exists.' };

  try {
    if (await Reseller.exists({ $or: [{ email }, { phone }] })) {
      return res.status(409).json(duplicate);
    }

    const passwordHash = await hashPassword(password);
    await Reseller.create({
      fullName,
      phone,
      whatsapp,
      email,
      passwordHash,
      channel,
      bankName,
      accountNumber,
      accountName,
    });

    void sendPartnerApplicationReceived({ fullName, email });

    return res.status(201).json({ ok: true });
  } catch (err: any) {
    // Two sign-ups racing past the check above are still caught by the unique indexes
    if (err?.code === 11000) return res.status(409).json(duplicate);
    console.error('[resellers] register failed:', err);
    return res.status(500).json({ error: 'Could not submit your application. Please try again.' });
  }
});

export default router;
