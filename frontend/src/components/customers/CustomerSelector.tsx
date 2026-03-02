import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Customer } from '@/types';

interface CustomerSelectorProps {
  customers: Customer[];
  value?: number;
  onChange: (customerId: number) => void;
  onNewCustomer: () => void;
  required?: boolean;
  label?: string;
}

export function CustomerSelector({
  customers,
  value,
  onChange,
  onNewCustomer,
  required,
  label,
}: CustomerSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const getCustomerName = (customer: Customer) => {
    if (customer.name) return customer.name;
    const firstName = customer.firstName || '';
    const lastName = customer.lastName || '';
    return `${firstName} ${lastName}`.trim() || 'Client inconnu';
  };

  const filteredCustomers = customers.filter(c => {
    const name = getCustomerName(c).toLowerCase();
    const email = (c.email || '').toLowerCase();
    const term = searchTerm.toLowerCase();
    return name.includes(term) || email.includes(term);
  });

  const selectedCustomer = customers.find(c => c.id === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div className="relative" ref={containerRef}>
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) {
              setTimeout(() => inputRef.current?.focus(), 0);
            }
          }}
          className={cn(
            'w-full flex items-center justify-between rounded-lg border px-3 py-2 text-sm bg-white',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'hover:border-gray-400',
            isOpen ? 'border-blue-500 ring-2 ring-blue-500' : 'border-gray-300'
          )}
        >
          <span className="font-medium text-gray-900">
            {selectedCustomer ? getCustomerName(selectedCustomer) : 'Sélectionner un client'}
          </span>
          <svg
            className={cn('w-4 h-4 transition-transform', isOpen && 'rotate-180')}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
            {/* Recherche */}
            <div className="p-2 border-b">
              <input
                ref={inputRef}
                type="text"
                placeholder="Rechercher un client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Liste des clients */}
            <div className="max-h-48 overflow-y-auto">
              {filteredCustomers.length === 0 ? (
                <div className="px-3 py-8 text-center text-gray-500 text-sm">
                  Aucun client trouvé
                </div>
              ) : (
                filteredCustomers.map(customer => (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => {
                      onChange(customer.id);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className={cn(
                      'w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between',
                      value === customer.id && 'bg-blue-100 font-medium'
                    )}
                  >
                    <div>
                      <div className="font-medium text-gray-900">{getCustomerName(customer)}</div>
                      {customer.email && <div className="text-xs text-gray-500">{customer.email}</div>}
                    </div>
                    {value === customer.id && (
                      <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Bouton Nouveau client */}
            <div className="border-t p-2">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setSearchTerm('');
                  onNewCustomer();
                }}
                className="w-full px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                + Nouveau client
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
