import { Schema, model, Document } from 'mongoose';

export interface IGift extends Document {
  name: string;
  description?: string;
  image: string;       // Primary cover image
  images: string[];    // Array of Cloudinary URLs for the carousel slider
  price: number;
  stock: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const giftSchema = new Schema<IGift>(
  {
    name: { type: String, required: true },
    description: { type: String, default: '' },
    image: { type: String, required: true },
    images: { type: [String], default: [] },
    price: { type: Number, default: 0 },
    stock: { type: Number, default: 10 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Gift = model<IGift>('Gift', giftSchema);