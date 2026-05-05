import type { Testimonial } from '@/types/testimonial';

export const TESTIMONIALS: Testimonial[] = [
  {
    id: 't1',
    name: 'Aisha Mohammed',
    location: 'Lagos',
    rating: 5,
    text: 'The Smart Combo completely transformed my daily routine. The build quality is exceptional!',
    isVerified: true,
    isPublished: true,
  },
  {
    id: 't2',
    name: 'Chukwu Okafor',
    location: 'Abuja',
    rating: 5,
    text: 'Best purchase this year. Fast delivery, excellent service, and amazing products.',
    isVerified: true,
    isPublished: true,
  },
  {
    id: 't3',
    name: 'Zainab Hassan',
    location: 'Ilorin',
    rating: 5,
    text: 'Love the features and premium feel. Worth every naira. Highly recommended!',
    isVerified: true,
    isPublished: true,
  },
];

export const getPublishedTestimonials = (): Testimonial[] =>
  TESTIMONIALS.filter((t) => t.isPublished);
