import { type NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Pages accessibles sans authentification (publiques)
  const publicPages = ['/', '/login', '/register', '/contact', '/about', '/pricing'];
  
  // Pages protégées qui nécessitent une authentification
  const protectedPages = ['/dashboard', '/projects', '/customers', '/quotes', '/invoices', '/suppliers', '/purchases', '/equipment', '/price-library', '/time-entries'];

  // Si c'est une page publique, laisser passer
  if (publicPages.includes(pathname)) {
    return NextResponse.next();
  }

  // Si c'est une page protégée, vérifier si on a un token
  const isProtectedPage = protectedPages.some(page => pathname.startsWith(page));
  if (isProtectedPage) {
    // On ne peut pas vérifier le token côté serveur avec localStorage
    // Le client handle la redirection si nécessaire
    return NextResponse.next();
  }

  // Autres pages : laisser passer
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Matcher tout sauf les assets statiques
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
