/**
 * WhatsAppFloat — sticky floating WhatsApp button.
 * Always visible bottom-right. Number from Site Settings.
 */

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';

const DEFAULT_MESSAGE =
  "Hi! I'm interested in the Smart Combo Pack. Can you tell me more about pricing and delivery?";

export function WhatsAppFloat() {
  const { settings } = useSettings();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const number = settings?.contact.whatsappNumber?.replace(/\D/g, '') ?? '';
  const link = number
    ? `https://wa.me/${number}?text=${encodeURIComponent(DEFAULT_MESSAGE)}`
    : '';

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(t);
  }, []);

  if (!number || dismissed) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 transition-all duration-500 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div className="hidden md:flex absolute right-full mr-3 top-1/2 -translate-y-1/2 items-center pointer-events-none">
        <div
          className="relative bg-white text-gray-900 text-xs font-semibold rounded-lg px-3 py-2 shadow-lg whitespace-nowrap"
          style={{ animation: 'wa-pulse 3s ease-in-out infinite' }}
        >
          Chat with us on WhatsApp
          <div
            className="absolute left-full top-1/2 -translate-y-1/2 w-0 h-0"
            style={{
              borderLeft: '6px solid white',
              borderTop: '5px solid transparent',
              borderBottom: '5px solid transparent',
            }}
          />
        </div>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gray-800 text-white flex items-center justify-center hover:bg-gray-700 z-10"
          aria-label="Hide WhatsApp button"
        >
          <X className="w-3 h-3" />
        </button>

        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat on WhatsApp"
          className="relative flex items-center justify-center w-14 h-14 rounded-full shadow-2xl transition-transform hover:scale-110 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
            boxShadow: '0 8px 32px rgba(37, 211, 102, 0.4)',
          }}
        >
          <span
            className="absolute inset-0 rounded-full"
            style={{
              background: 'rgba(37, 211, 102, 0.6)',
              animation: 'wa-ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
            }}
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="white"
            className="w-7 h-7 relative z-10"
          >
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z" />
          </svg>
        </a>
      </div>

      <style>{`
        @keyframes wa-ping {
          0% { transform: scale(1); opacity: 0.6; }
          75%, 100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes wa-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}
