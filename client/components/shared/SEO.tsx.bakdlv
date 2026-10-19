import { Helmet } from 'react-helmet-async';

interface Props {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'product' | 'article';
}

const DEFAULT_TITLE = 'Smart Combo — Premium Lifestyle Gadgets in Nigeria';
const DEFAULT_DESC =
  'Smart Watch, Audio Glasses, and Premium Bracelet — three premium pieces, one unbeatable price. Free nationwide delivery in Nigeria.';

export function SEO({ title, description, image, url, type = 'website' }: Props) {
  const fullTitle = title ? `${title} | Smart Combo` : DEFAULT_TITLE;
  const desc = description ?? DEFAULT_DESC;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />

      {/* Open Graph (WhatsApp / Facebook) */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:type" content={type} />
      {url && <meta property="og:url" content={url} />}
      {image && <meta property="og:image" content={image} />}
      <meta property="og:site_name" content="Smart Combo" />
      <meta property="og:locale" content="en_NG" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      {image && <meta name="twitter:image" content={image} />}
    </Helmet>
  );
}
