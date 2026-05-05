/**
 * Site settings — TEMPORARY HARDCODED VERSION
 *
 * Replace with /api/settings fetch when backend is ready.
 *
 * IMPORTANT: Update the WhatsApp number, phone, email below to your real values
 * before launch.
 */

import type { SiteSettings } from '@/types/settings';

// Compute promo end date: 5 days from now (this stays even after refresh
// because we'll move it to backend; for now it'll reset on each visit
// — that's actually fine for development).
const promoEnd = new Date();
promoEnd.setDate(promoEnd.getDate() + 5);
promoEnd.setHours(23, 59, 59, 0);

const WHATSAPP_NUMBER = '+2348142746379'; // ← REPLACE with real number before launch


const whatsappDigits = WHATSAPP_NUMBER.replace(/\D/g, '');

export const SETTINGS: SiteSettings = {
  storeName: 'Smart Combo',
  tagline: 'Premium lifestyle gadgets for the modern professional.',
  defaultHeroImage: '/images/hero_image.avif',

  heroSlides: [
    { id: 'h1', image: '/images/glasses3.avif',  accent: 'from-[#1a0a2e] via-[#16213e] to-[#0f3460]', tag: 'See the World Differently' },
    { id: 'h2', image: '/images/glasses4.avif',  accent: 'from-[#0f0c29] via-[#302b63] to-[#24243e]', tag: 'Fashion Meets Function' },
    { id: 'h3', image: '/images/watch3.avif',    accent: 'from-[#0d1b2a] via-[#1b2838] to-[#2d1b69]', tag: 'Time, Redefined' },
    { id: 'h4', image: '/images/watch4.avif',    accent: 'from-[#0a0a1a] via-[#1a1040] to-[#0f2040]', tag: 'Precision on Your Wrist' },
    { id: 'h5', image: '/images/bracelet1.avif', accent: 'from-[#1a0f0a] via-[#2a1a10] to-[#3d2010]', tag: 'Elegance Reimagined' },
    { id: 'h6', image: '/images/bracelet2.avif', accent: 'from-[#1a0a0f] via-[#251020] to-[#1a0a2e]', tag: 'Wear Your Story' },
    { id: 'h7', image: '/images/glasses1.avif',  accent: 'from-[#1a1a2e] via-[#16213e] to-[#0f3460]', tag: 'The Complete Look' },
  ],

  promo: {
    endsAt: promoEnd.toISOString(),
    enabled: true,
    headline: 'Price goes back to ₦105,000 when timer hits zero',
    subline: 'Only 15 combo packs left at this price',
  },

  contact: {
    whatsappNumber: WHATSAPP_NUMBER,
    whatsappLink: `https://wa.me/${whatsappDigits}`,
    email: 'support@smartcombo.ng',
    phone: '+234 (0) 123 456 7890',  // ← REPLACE with real phone before launch
    address: 'Ilorin, Kwara State, Nigeria',
  },

  video: {
    // ← REPLACE with your actual product demo video before launch
    url: 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1',
    thumbnail: '/images/hero_image.avif',
    title: 'Smart Combo — Product Demo',
    duration: '2:30 min',
  },

  trustStats: {
    rating: 4.9,
    reviewCount: 2500,
  },
};
