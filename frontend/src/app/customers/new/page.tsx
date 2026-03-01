'use client';

import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { NewCustomerForm } from '@/components/customers/NewCustomerForm';

export default function NewCustomerPage() {
  const router = useRouter();

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto py-6">
        <div className="mb-6 flex items-center gap-3">
          <button type="button" onClick={() => router.push('/customers')}
            className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Nouveau client</h1>
            <p className="text-sm text-slate-500">Créer un nouveau client</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <NewCustomerForm
            onSuccess={() => router.push('/customers')}
            onClose={() => router.push('/customers')}
          />
        </div>
      </div>
    </MainLayout>
  );
}