/**
 * Reseller sign-up — frontend API call.
 * Goes to POST /api/resellers/register (server/routes/resellers.ts).
 */

export interface ResellerApplication {
  fullName: string;
  phone: string;
  whatsapp: string;
  email: string;
  password: string;
  channel?: string;
  /** Payout details, required by the sign-up form (Partner Program plan, section 5). */
  bankName: string;
  accountNumber: string;
  accountName: string;
  /** Honeypot field. Always sent as typed; real people leave it empty. */
  website?: string;
}

/** Resolves when the application was saved. Throws an Error with a message you can show the person. */
export async function registerReseller(input: ResellerApplication): Promise<void> {
  let res: Response;
  try {
    res = await fetch('/api/resellers/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }

  if (!res.ok) {
    let message = 'Something went wrong. Please try again.';
    try {
      const body = await res.json();
      if (typeof body?.error === 'string') message = body.error;
    } catch {
      /* keep the default message */
    }
    throw new Error(message);
  }
}
