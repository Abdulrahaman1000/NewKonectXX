import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/shared/CartDrawer';
import { useSettings } from '@/contexts/SettingsContext';

export default function Contact() {
  const { settings } = useSettings();

  if (!settings) return null;

  const channels = [
    {
      Icon: MessageCircle,
      title: 'WhatsApp',
      desc: '24/7 — fastest response',
      action: 'Chat now',
      href: settings.contact.whatsappLink,
      external: true,
      highlight: true,
    },
    {
      Icon: Phone,
      title: 'Phone',
      desc: settings.contact.phone,
      action: 'Call now',
      href: `tel:${settings.contact.phone.replace(/\s/g, '')}`,
      external: false,
    },
    {
      Icon: Mail,
      title: 'Email',
      desc: settings.contact.email,
      action: 'Send email',
      href: `mailto:${settings.contact.email}`,
      external: false,
    },
    {
      Icon: MapPin,
      title: 'Location',
      desc: settings.contact.address,
      action: null,
      href: null,
      external: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      <CartDrawer />

      <main className="flex-1 section-padding py-12">
        <div className="container-premium max-w-4xl">
          <div className="text-center mb-12">
            <div className="text-6xl mb-4">💬</div>
            <h1 className="text-3xl md:text-4xl font-black text-white mb-2">Get In Touch</h1>
            <p className="text-white/50">
              We respond within minutes on WhatsApp, hours on email.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {channels.map(({ Icon, title, desc, action, href, external, highlight }) => (
              <div
                key={title}
                className={`p-6 rounded-2xl border transition-colors ${
                  highlight
                    ? 'border-primary/40 hover:border-primary/60'
                    : 'border-white/10 hover:border-white/25'
                }`}
                style={{
                  background: highlight ? 'rgba(255,215,0,0.04)' : 'rgba(255,255,255,0.02)',
                }}
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-base font-bold text-white mb-1">{title}</h2>
                <p className="text-sm text-white/55 mb-4 break-words">{desc}</p>
                {action && href && (
                  <a
                    href={href}
                    target={external ? '_blank' : undefined}
                    rel={external ? 'noopener noreferrer' : undefined}
                    className={`inline-flex items-center gap-1.5 text-sm font-semibold ${
                      highlight ? 'text-primary hover:underline' : 'text-white/70 hover:text-primary'
                    }`}
                  >
                    {action} →
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
