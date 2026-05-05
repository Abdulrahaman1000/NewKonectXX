import { Link } from 'react-router-dom';
import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';

export function Footer() {
  const currentYear = new Date().getFullYear();
  const { settings } = useSettings();

  const storeName = settings?.storeName ?? 'Smart Combo';
  const tagline = settings?.tagline ?? 'Premium lifestyle gadgets for the modern professional.';
  const whatsappLink = settings?.contact.whatsappLink ?? '#';
  const email = settings?.contact.email ?? '';
  const phone = settings?.contact.phone ?? '';
  const address = settings?.contact.address ?? '';

  return (
    <footer className="border-t border-[rgba(255,255,255,0.1)] bg-[rgba(0,0,0,0.2)]">
      <div className="container-premium section-padding py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-[#ffed4e] flex items-center justify-center font-bold text-primary-foreground">
                SC
              </div>
              <span className="font-bold text-lg">{storeName}</span>
            </div>
            <p className="text-sm text-foreground/60">{tagline}</p>
            <div className="flex gap-3">
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Chat on WhatsApp"
                className="p-2 hover:bg-[rgba(255,255,255,0.1)] rounded-lg transition-colors"
              >
                <MessageCircle className="w-5 h-5 text-primary" />
              </a>
              {email && (
                <a
                  href={`mailto:${email}`}
                  aria-label={`Email ${email}`}
                  className="p-2 hover:bg-[rgba(255,255,255,0.1)] rounded-lg transition-colors"
                >
                  <Mail className="w-5 h-5 text-primary" />
                </a>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="text-foreground/70 hover:text-primary transition-colors">Home</Link></li>
              <li><Link to="/products" className="text-foreground/70 hover:text-primary transition-colors">Products</Link></li>
              <li><Link to="/order-tracking" className="text-foreground/70 hover:text-primary transition-colors">Track Order</Link></li>
              <li><Link to="/contact" className="text-foreground/70 hover:text-primary transition-colors">Contact Us</Link></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Support</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/faq" className="text-foreground/70 hover:text-primary transition-colors">FAQ</Link></li>
              <li><Link to="/shipping" className="text-foreground/70 hover:text-primary transition-colors">Shipping Info</Link></li>
              <li><Link to="/returns" className="text-foreground/70 hover:text-primary transition-colors">Returns</Link></li>
              <li><Link to="/privacy" className="text-foreground/70 hover:text-primary transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Contact Info</h3>
            <ul className="space-y-3 text-sm">
              {phone && (
                <li className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <a href={`tel:${phone.replace(/\s/g, '')}`} className="text-foreground/70 hover:text-primary transition-colors">
                    {phone}
                  </a>
                </li>
              )}
              <li className="flex items-start gap-3">
                <MessageCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="text-foreground/70 hover:text-primary transition-colors">
                  Chat on WhatsApp
                </a>
              </li>
              {address && (
                <li className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/70">{address}</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="border-t border-[rgba(255,255,255,0.1)] pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-foreground/60">
            <p>&copy; {currentYear} {storeName} NG. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-primary transition-colors">Terms & Conditions</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
