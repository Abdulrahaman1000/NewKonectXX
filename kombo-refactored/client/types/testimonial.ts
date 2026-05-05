export interface Testimonial {
  id: string;
  name: string;
  location: string;        // "Lagos"
  rating: number;          // 1-5
  text: string;
  isVerified: boolean;
  isPublished: boolean;    // admin can hide
  createdAt?: string;
}
