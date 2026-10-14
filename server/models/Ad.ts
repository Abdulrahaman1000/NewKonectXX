/** Marketing material for partners (image / video / caption only). Destination: server/models/Ad.ts
 *  Captions may contain {{LINK}}, replaced with the partner's own link when they view it. */
import mongoose, { Schema } from "mongoose";

const adSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    /** Product or combo this is for, shown as a label (free text) */
    product: { type: String, trim: true, maxlength: 120, default: "" },
    kind: { type: String, enum: ["image", "video", "text"], default: "image" },
    url: { type: String, trim: true, default: "" },
    whatsappCaption: { type: String, trim: true, maxlength: 2000, default: "" },
    instagramCaption: { type: String, trim: true, maxlength: 2200, default: "" },
    tiktokCaption: { type: String, trim: true, maxlength: 2200, default: "" },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export const Ad: mongoose.Model<any> = mongoose.models.Ad ?? mongoose.model("Ad", adSchema);
