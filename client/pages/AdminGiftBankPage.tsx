import React, { useState, useEffect } from 'react';
import { Gift, Trash2, Plus, Upload, Loader2, X, ArrowLeft } from 'lucide-react';
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

export function AdminGiftBank() {
  const [gifts, setGifts] = useState<IGift[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('10');
  
  // Multi-image selection state
  const [images, setImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

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

  // Convert uploaded files to base64 and append to images array
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    const fileArray = Array.from(files);
    const readPromises = fileArray.map((file) => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readPromises)
      .then((newBase64Images) => {
        setImages((prev) => [...prev, ...newBase64Images]);
      })
      .catch((err) => console.error('Error reading files:', err))
      .finally(() => {
        setIsUploading(false);
        e.target.value = ''; // Reset input value so continuous selecting works
      });
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (images.length === 0) {
      alert('Please select at least one image.');
      return;
    }

    setIsSaving(true);
    
    // Save both 'image' (for backwards compatibility) and 'images' (for multi-image)
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
        fetchGifts();
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              {/* Multi Image Upload Box */}
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5">
                  Product Images ({images.length} Selected)
                </label>
                
                <div className="flex flex-wrap gap-2 items-center">
                  {images.map((url, idx) => (
                    <div
                      key={idx}
                      className="relative w-14 h-14 rounded-xl overflow-hidden border border-white/20 group bg-black/40"
                    >
                      <img src={url} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                      
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
                  ))}

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

        {/* Inventory Listing */}
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
                // Fallback check to support old single-image items & new multi-image items
                const displayImage = gift.image || (gift.images && gift.images[0]) || '';

                return (
                  <div
                    key={gift._id}
                    className="bg-[#12141c] border border-white/10 rounded-xl p-3 flex items-center gap-3 relative group"
                  >
                    {displayImage ? (
                      <img
                        src={displayImage}
                        alt={gift.name}
                        className="w-12 h-12 rounded-lg object-cover bg-black/40"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center text-white/30 text-xs">
                        No img
                      </div>
                    )}
                    
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