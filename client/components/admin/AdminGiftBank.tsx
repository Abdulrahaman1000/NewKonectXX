import React, { useState, useEffect } from 'react';
import { Gift, Trash2, Plus, Upload, Loader2, X, ArrowLeft, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface IGift {
  _id: string;
  name: string;
  description?: string;
  image?: string;
  images?: string[];
  price: number;
  stock: number;
  isActive: boolean;
}

// Internal Component: Automatically loops through images for inventory cards
function GiftCardImageSlider({ images, name }: { images: string[]; name: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!images || images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 2500);

    return () => clearInterval(interval);
  }, [images]);

  if (!images || images.length === 0) {
    return (
      <div className="w-16 h-16 rounded-lg bg-white/5 flex items-center justify-center text-white/30 text-[10px]">
        No img
      </div>
    );
  }

  return (
    <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-black/40 border border-white/10 flex-shrink-0">
      <img
        src={images[currentIndex]}
        alt={`${name} - ${currentIndex + 1}`}
        className="w-full h-full object-cover transition-all duration-500 ease-in-out"
      />
      {images.length > 1 && (
        <div className="absolute bottom-1 inset-x-0 flex justify-center gap-0.5">
          {images.map((_, idx) => (
            <span
              key={idx}
              className={`h-1 rounded-full transition-all duration-300 ${
                idx === currentIndex ? 'w-2.5 bg-emerald-400' : 'w-1 bg-white/40'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminGiftBank() {
  const [gifts, setGifts] = useState<IGift[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('10');
  
  const [images, setImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Tracks active index for live preview box in the form
  const [previewIndex, setPreviewIndex] = useState(0);

  // AUTO-SLIDER EFFECT: Automatically switches live preview image every 2.5 seconds
  useEffect(() => {
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      setPreviewIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 2500);

    return () => clearInterval(interval);
  }, [images]);

  useEffect(() => {
    fetchGifts();
  }, []);

  const fetchGifts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/gifts');
      if (res.ok) {
        const data = await res.json();
        setGifts(data);
      }
    } catch (err) {
      console.error('Failed to load gifts', err);
    } finally {
      setIsLoading(false);
    }
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
      };
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      const fileArray = Array.from(files);
      const compressedImages = await Promise.all(
        fileArray.map((file) => compressImage(file))
      );
      setImages((prev) => [...prev, ...compressedImages]);
    } catch (err) {
      console.error('Error compressing files:', err);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPreviewIndex(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (images.length === 0) {
      alert('Please select at least one image.');
      return;
    }

    setIsSaving(true);
    
    const payload = {
      name,
      description,
      price: Number(price) || 0,
      stock: Number(stock) || 0,
      image: images[0],
      images,
      isActive: true,
    };

    try {
      const res = await fetch('/api/admin/gifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setName('');
        setDescription('');
        setPrice('');
        setStock('10');
        setImages([]);
        setPreviewIndex(0);
        fetchGifts();
      } else {
        const errorText = await res.text();
        alert(`Server Error: ${errorText}`);
      }
    } catch (err) {
      console.error('Failed to create gift:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this gift?')) return;

    try {
      const res = await fetch(`/api/admin/gifts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setGifts((prev) => prev.filter((g) => g._id !== id));
      }
    } catch (err) {
      console.error('Failed to delete gift:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0b0e] text-white p-4 sm:p-10">
      <div className="max-w-5xl mx-auto space-y-6">
        
        <Link
          to="/admin/dashboard"
          className="inline-flex items-center gap-2 text-xs font-semibold text-white/50 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400">
            <Gift className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Free Gift Bank Manager</h1>
            <p className="text-xs text-white/50">
              Manage free gifts, estimated prices, and available stock inventory.
            </p>
          </div>
        </div>

        <div className="bg-[#12141c] border border-white/10 rounded-2xl p-4 sm:p-6 space-y-5">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 tracking-wider uppercase">
            <Plus className="w-4 h-4" />
            <span>Add New Free Gift Item</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <div className="md:col-span-2 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1.5">
                    Gift Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rolex Submariner"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#0a0b0e] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                {/* Thumbnails Upload & Picker */}
                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1.5">
                    Product Images ({images.length} Selected)
                  </label>
                  
                  <div className="flex flex-wrap gap-2 items-center">
                    {images.map((url, idx) => {
                      const isActive = idx === previewIndex;
                      return (
                        <div
                          key={idx}
                          className={`relative w-14 h-14 rounded-xl overflow-hidden border transition-all duration-300 group bg-black/40 ${
                            isActive
                              ? 'border-emerald-500 scale-105 shadow-md shadow-emerald-500/20 ring-1 ring-emerald-500'
                              : 'border-white/20 opacity-60'
                          }`}
                        >
                          <img
                            src={url}
                            alt={`Upload ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          
                          {idx === 0 && (
                            <span className="absolute bottom-0 inset-x-0 bg-emerald-500 text-black font-black text-[7px] text-center py-0.5 uppercase">
                              Cover
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="absolute inset-0 bg-black/70 flex items-center justify-center text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}

                    <label className="w-14 h-14 border-2 border-dashed border-white/20 hover:border-emerald-500 rounded-xl flex flex-col items-center justify-center cursor-pointer text-white/40 hover:text-emerald-400 transition-colors bg-white/5">
                      {isUploading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          <span className="text-[8px] font-bold mt-1">
                            {images.length > 0 ? '+ More' : '+ Add'}
                          </span>
                        </>
                      )}
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* LIVE AUTO-SLIDING PREVIEW BOX */}
              <div className="flex flex-col">
                <label className="block text-xs font-semibold text-white/70 mb-1.5 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Auto-Slider Preview</span>
                </label>
                <div className="relative flex-1 min-h-[140px] bg-[#0a0b0e] border border-white/10 rounded-xl overflow-hidden flex items-center justify-center group">
                  {images.length > 0 ? (
                    <>
                      <img
                        src={images[previewIndex]}
                        alt="Live Slider Preview"
                        className="w-full h-full object-cover transition-all duration-500 ease-in-out"
                      />
                      <div className="absolute top-2 right-2 bg-black/60 px-2 py-0.5 rounded text-[9px] font-bold text-emerald-400 border border-emerald-500/20">
                        {previewIndex + 1} / {images.length}
                      </div>
                      {images.length > 1 && (
                        <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1">
                          {images.map((_, idx) => (
                            <span
                              key={idx}
                              className={`h-1.5 rounded-full transition-all duration-300 ${
                                idx === previewIndex ? 'w-4 bg-emerald-400' : 'w-1.5 bg-white/40'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-[10px] text-white/30 text-center px-4">
                      Upload images above to test auto-sliding preview
                    </p>
                  )}
                </div>
              </div>

            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5">
                  Estimated Price / Value (₦)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 23000"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full bg-[#0a0b0e] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5">
                  Quantity / Stock Available
                </label>
                <input
                  type="number"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="w-full bg-[#0a0b0e] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5">
                Description (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Complimentary gift for orders over ₦40,000"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[#0a0b0e] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isSaving || isUploading}
              className="py-2.5 px-5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>Add Gift to Bank</span>
            </button>
          </form>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-bold text-white/70">
            Active Gift Inventory ({gifts.length})
          </h2>

          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-white/40">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : gifts.length === 0 ? (
            <div className="text-center py-10 bg-[#12141c] border border-white/10 rounded-xl text-white/40 text-xs">
              No gifts added yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {gifts.map((gift) => {
                const giftImages =
                  gift.images && gift.images.length > 0
                    ? gift.images
                    : gift.image
                    ? [gift.image]
                    : [];

                return (
                  <div
                    key={gift._id}
                    className="bg-[#12141c] border border-white/10 rounded-xl p-3 flex items-center gap-3 relative group"
                  >
                    {/* Auto-sliding thumbnail component */}
                    <GiftCardImageSlider images={giftImages} name={gift.name} />

                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs font-bold truncate">{gift.name}</h3>
                      <p className="text-[10px] text-white/50">
                        Value:{' '}
                        <span className="line-through">₦{gift.price?.toLocaleString()}</span>{' '}
                        <span className="text-emerald-400 font-bold">FREE</span>
                      </p>
                      <span className="inline-block mt-1 text-[9px] bg-emerald-500/10 text-emerald-400 font-bold px-1.5 py-0.5 rounded">
                        {gift.stock} Remaining
                      </span>
                    </div>

                    <button
                      onClick={() => handleDelete(gift._id)}
                      className="text-white/30 hover:text-red-400 p-1.5 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default AdminGiftBank;