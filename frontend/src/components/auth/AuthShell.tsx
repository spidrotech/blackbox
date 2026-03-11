import Link from 'next/link';
import { GestarLogoFull } from '@/components/ui/GestarLogo';

type AuthShellProps = {
  badge: string;
  title: string;
  accent: string;
  description: string;
  points: string[];
  children: React.ReactNode;
};

export function AuthShell({ badge, title, accent, description, points, children }: AuthShellProps): JSX.Element {
  return (
    <div className="min-h-screen bg-stone-50 text-slate-900 lg:grid lg:grid-cols-[minmax(420px,0.95fr)_minmax(0,1.05fr)]">
      <aside className="relative hidden overflow-hidden border-r border-slate-200 bg-white lg:block">
        <div className="absolute left-[-4rem] top-10 h-56 w-56 rounded-full bg-sky-100/80 blur-3xl" />
        <div className="absolute bottom-[-4rem] right-[-4rem] h-64 w-64 rounded-full bg-slate-200/70 blur-3xl" />
        <div className="relative flex h-full flex-col px-10 py-10 xl:px-14">
          <Link href="/" className="w-fit">
            <GestarLogoFull size={34} />
          </Link>

          <div className="my-auto max-w-md pt-10">
            <span className="inline-flex rounded-full border border-sky-200 bg-stone-50 px-4 py-1.5 text-sm font-medium text-sky-700 shadow-sm">
              {badge}
            </span>
            <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-950 xl:text-5xl xl:leading-[1.02]">
              {title}
              <span className="mt-2 block text-sky-700">{accent}</span>
            </h1>
            <p className="mt-6 text-base leading-8 text-slate-600 xl:text-lg">{description}</p>

            <div className="mt-10 space-y-3">
              {points.map((point) => (
                <div key={point} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-stone-50 px-4 py-4 shadow-sm">
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-slate-950" />
                  <span className="text-sm leading-6 text-slate-700">{point}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-slate-400">&copy; {new Date().getFullYear()} Gestar. Tous droits réservés.</p>
        </div>
      </aside>

      <main className="flex min-h-screen items-center justify-center px-6 py-10 sm:px-8 lg:px-12">
        <div className="w-full max-w-lg">
          <Link href="/" className="mb-8 inline-flex lg:hidden">
            <GestarLogoFull size={32} />
          </Link>
          {children}
        </div>
      </main>
    </div>
  );
}