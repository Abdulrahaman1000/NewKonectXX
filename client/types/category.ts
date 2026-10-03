/**
 * Category type — mirrors backend Category model.
 */

export interface Category {
  _id?: string;
  id?: string;
  slug: string;
  name: string;
  icon: string;
  /** Optional picture (Cloudinary URL). Shown instead of the emoji when set. */
  image?: string;
  description: string;
  displayOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}