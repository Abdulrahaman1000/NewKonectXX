/**
 * POST /api/Resellers/register — save a Reseller application as "pending".
 *
 * Mount it in server/index.ts, AFTER express.json():
 *   import ResellersRouter from './routes/Resellers';
 *   app.use('/api/Resellers', ResellersRouter);
 */

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { Reseller } from '../models/Reseller';

const router = Router();

const PHONE_RE = /^\+?\d{10,15}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const phoneOf = (v: unknown) => text(v, 30).replace(/[\s-]/g, '');

router.post('/register', async (req, res) => {
  const body = req.body ?? {};

  // Honeypot: real people never fill this in. Answer "ok" so bots learn nothing.
  if (text(body.website, 100)) return res.status(201).json({ ok: true });

  const fullName = text(body.fullName, 100);
  const phone = phoneOf(body.phone);
  const whatsapp = phoneOf(body.whatsapp) || phone;
  const email = text(body.email, 150).toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';
  const channel = text(body.channel, 200);

  if (fullName.length < 2) return res.status(400).json({ error: 'Please enter your full name.' });
  if (!PHONE_RE.test(phone)) return res.status(400).json({ error: 'Please enter a valid phone number.' });
  if (!PHONE_RE.test(whatsapp)) return res.status(400).json({ error: 'Please enter a valid WhatsApp number.' });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  // bcrypt only reads the first 72 bytes, so longer passwords add nothing
  if (password.length < 8 || password.length > 72) {
    return res.status(400).json({ error: 'Your password must be 8 to 72 characters.' });
  }

  const duplicate = { error: 'A Reseller with this email or phone number already exists.' };

  try {
    if (await Reseller.exists({ $or: [{ email }, { phone }] })) {
      return res.status(409).json(duplicate);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await Reseller.create({ fullName, phone, whatsapp, email, passwordHash, channel });

    return res.status(201).json({ ok: true });
  } catch (err: any) {
    // Two sign-ups racing past the check above are still caught by the unique indexes
    if (err?.code === 11000) return res.status(409).json(duplicate);
    console.error('[Resellers] register failed:', err);
    return res.status(500).json({ error: 'Could not submit your application. Please try again.' });
  }
});

export default router;
