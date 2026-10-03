import { Router } from 'express';
import { Gift } from '../../models/Gift';

const router = Router();

// GET all gifts (Admin)
router.get('/', async (req, res) => {
  try {
    const gifts = await Gift.find().sort({ createdAt: -1 });
    res.json(gifts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching gifts', error });
  }
});

// CREATE new gift (Supports multiple Cloudinary image URLs)
router.post('/', async (req, res) => {
  try {
    const { name, description, price, stock, isActive, image, images } = req.body;

    // Build normalized array of image URLs
    const imageList: string[] = Array.isArray(images) && images.length > 0
      ? images
      : image
      ? [image]
      : [];

    const newGift = await Gift.create({
      name,
      description,
      price: price ?? 0,
      stock: stock ?? 10,
      isActive: isActive ?? true,
      image: image || imageList[0] || '',
      images: imageList,
    });

    res.status(201).json(newGift);
  } catch (error) {
    res.status(500).json({ message: 'Error creating gift', error });
  }
});

// UPDATE gift
router.put('/:id', async (req, res) => {
  try {
    const { name, description, price, stock, isActive, image, images } = req.body;

    const imageList: string[] = Array.isArray(images) && images.length > 0
      ? images
      : image
      ? [image]
      : [];

    const updatedGift = await Gift.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        price,
        stock,
        isActive,
        image: image || imageList[0] || '',
        images: imageList,
      },
      { new: true }
    );

    if (!updatedGift) {
      return res.status(404).json({ message: 'Gift not found' });
    }

    res.json(updatedGift);
  } catch (error) {
    res.status(500).json({ message: 'Error updating gift', error });
  }
});

// DELETE gift
router.delete('/:id', async (req, res) => {
  try {
    await Gift.findByIdAndDelete(req.params.id);
    res.json({ message: 'Gift deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting gift', error });
  }
});

export default router;