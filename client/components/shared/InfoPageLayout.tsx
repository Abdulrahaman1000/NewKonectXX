import { ReactNode } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/shared/CartDrawer';
import { SEO } from '@/components/shared/SEO';

interface Props {
  title: string;
  description?: string;
  icon?: string;
  children: ReactNode;
}

/**
 * Generic content page layout for static info pages
 * (Shipping, Returns, Privacy, Terms, etc.)
 *
 * Colours use theme tokens (foreground / muted / card) instead of fixed white,
 * so the text is readable in both light and dark mode.
 */
export function InfoPageLayout({ title, description, icon, children }: Props) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEO title={title} description={description} />
      <Header />
      <CartDrawer />

      <main className="flex-1 section-padding py-12">
        <div className="container-premium max-w-3xl">
          <header className="text-center mb-12">
            {icon && <div className="text-5xl mb-3">{icon}</div>}
            <h1 className="text-3xl md:text-4xl font-black text-foreground mb-2">{title}</h1>
            {description && <p className="text-muted-foreground max-w-md mx-auto">{description}</p>}
          </header>

          <article
            className="prose max-w-none rounded-2xl border border-border bg-card/60 p-6 md:p-8 space-y-6
                       text-foreground/80
                       prose-headings:text-foreground prose-headings:font-bold
                       prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-3
                       prose-h3:text-base prose-h3:mt-6 prose-h3:mb-2
                       prose-p:text-foreground/75 prose-p:text-sm prose-p:leading-relaxed
                       prose-ul:text-foreground/75 prose-ul:text-sm
                       prose-ol:text-foreground/75 prose-ol:text-sm
                       prose-li:my-1 prose-li:text-foreground/75 prose-li:marker:text-foreground/50
                       prose-strong:text-foreground
                       prose-a:text-[hsl(var(--gold-text))] prose-a:no-underline hover:prose-a:underline"
          >
            {children}
          </article>
        </div>
      </main>

      <Footer />
    </div>
  );
}
