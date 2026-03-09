import Link from 'next/link';
import { GestarLogoFull } from '@/components/ui/GestarLogo';
import { MarketingFooter } from './MarketingFooter';

export function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/"><GestarLogoFull size={32} /></Link>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-500">
            <Link href="/#features" className="hover:text-gray-900 transition-colors">Fonctionnalités</Link>
            <Link href="/pricing" className="hover:text-gray-900 transition-colors">Tarifs</Link>
            <Link href="/contact" className="hover:text-gray-900 transition-colors">Contact</Link>
            <Link href="/about" className="hover:text-gray-900 transition-colors">À propos</Link>
          </div>
          <Link href="/login" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
            Se connecter
          </Link>
        </div>
      </nav>
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
