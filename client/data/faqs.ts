import type { FAQ } from '@/types/faq';

export const FAQS: FAQ[] = [
  {
    id: 'faq-1',
    question: 'What is included in the Smart Combo package?',
    answer:
      'The Smart Combo includes one Smart Watch Pro, one pair of Bluetooth Audio Glasses, and one Premium Bracelet — each with a charging cable, user manual, and warranty documentation.',
    order: 1,
    isPublished: true,
  },
  {
    id: 'faq-2',
    question: 'What is the warranty period?',
    answer:
      "All products come with a 1-year manufacturer's warranty. Extended options are available at checkout.",
    order: 2,
    isPublished: true,
  },
  {
    id: 'faq-3',
    question: 'Do you deliver to all states in Nigeria?',
    answer:
      'Yes, nationwide. Ilorin 2–3 days, other states 5–7 business days. COD only available in Ilorin.',
    order: 3,
    isPublished: true,
  },
  {
    id: 'faq-4',
    question: 'What payment methods are available?',
    answer:
      'Card, Bank Transfer, USSD, and Mobile Money via Paystack and Flutterwave. Ilorin customers can also use Cash on Delivery.',
    order: 4,
    isPublished: true,
  },
  {
    id: 'faq-5',
    question: 'Can I return the products?',
    answer: '14-day return policy for unused items in original packaging.',
    order: 5,
    isPublished: true,
  },
  {
    id: 'faq-6',
    question: 'Are there any hidden charges?',
    answer: 'None. All prices include VAT. Delivery fees shown before payment.',
    order: 6,
    isPublished: true,
  },
];

export const getPublishedFaqs = (): FAQ[] =>
  FAQS.filter((f) => f.isPublished).sort((a, b) => a.order - b.order);
