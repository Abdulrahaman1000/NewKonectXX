import { useTheme } from '@/lib/theme';

type Props = {
  /** 'header' = mark + wordmark (no tagline); 'full' = with tagline */
  variant?: 'header' | 'full';
  alt?: string;
  className?: string;
  /** keep the dark-theme logo regardless of theme (e.g. admin, dark panels) */
  forceDark?: boolean;
};

export default function Logo({ variant = 'header', alt = 'Smart Combo', className = 'h-11 w-auto', forceDark = false }: Props) {
  const { resolved } = useTheme();
  const mode = forceDark || resolved !== 'light' ? 'dark' : 'light';
  const base = variant === 'full' ? 'logo-full' : 'logo-header';
  return (
    <img
      src={`/${base}-${mode}.png`}
      alt={alt}
      className={`object-contain select-none ${className}`}
      draggable={false}
    />
  );
}
