import Link from 'next/link';
import { GestarLogoFull } from '@/components/ui/GestarLogo';
import { MarketingFooter } from './MarketingFooter';

export function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-slate-900">
      <nav className="sticky top-0 z-50 border-b border-slate-200/80 bg-stone-50/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/"><GestarLogoFull size={32} /></Link>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <Link href="/#features" className="transition-colors hover:text-slate-950">Fonctionnalités</Link>
            <Link href="/pricing" className="transition-colors hover:text-slate-950">Tarifs</Link>
            <Link href="/contact" className="transition-colors hover:text-slate-950">Contact</Link>
            <Link href="/about" className="transition-colors hover:text-slate-950">À propos</Link>
          </div>
          <Link href="/login" className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800">
            Se connecter
          </Link>
        </div>
      </nav>
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
