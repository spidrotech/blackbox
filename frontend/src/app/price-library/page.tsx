'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Input, Select } from '@/components/ui';
import { priceLibraryService } from '@/services/api';
import { PriceLibraryItem, PriceLibraryItemCreate } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { buildEditPath } from '@/lib/routes';

const typeOptions = [
  { value: '', label: 'Tous les types' },
  { value: 'supply', label: 'Fourniture' },
  { value: 'labor', label: 'Main d\'œuvre' },
  { value: 'other', label: 'Autre' },
];

export default function PriceLibraryPage() {
  const [items, setItems] = useState<PriceLibraryItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [importLoading, setImportLoading] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [itemsRes, categoriesRes] = await Promise.all([
        priceLibraryService.getAll(),
        priceLibraryService.getCategories(),
      ]);
      
      if (itemsRes.success) {
        setItems(Array.isArray(itemsRes.data) ? itemsRes.data : []);
      }
      if (categoriesRes.success) {
        setCategories((categoriesRes.data as unknown as string[]) || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const categoryOptions = [
    { value: '', label: 'Toutes les catégories' },
    ...categories.map(c => ({ value: c, label: c })),
  ];

  const filteredItems = items.filter(item => {
    const matchesSearch = search === '' || 
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description?.toLowerCase().includes(search.toLowerCase());
    
    const matchesType = typeFilter === '' || item.item_type === typeFilter;
    const matchesCategory = categoryFilter === '' || item.category === categoryFilter;
    
    return matchesSearch && matchesType && matchesCategory;
  });

  const handleToggleFavorite = async (id: number) => {
    try {
      await priceLibraryService.toggleFavorite(id);
      loadData();
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleDuplicate = async (id: number) => {
    try {
      await priceLibraryService.duplicate(id);
      loadData();
    } catch (error) {
      console.error('Error duplicating item:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) return;
    
    try {
      await priceLibraryService.delete(id);
      setItems(items.filter(i => i.id !== id));
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const parseNumber = (value: unknown, fallback: number): number => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
    if (typeof value !== 'string') return fallback;
    const normalized = value.replace(/\s/g, '').replace(/€/g, '').replace(',', '.');
    const parsed = parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const normalizeItem = (row: Record<string, unknown>) => {
    const name = String(row.name || row.designation || row.description || '').trim();
    if (!name) return null;
    const itemTypeRaw = String(row.item_type || row.itemType || row.type || 'supply').toLowerCase();
    const itemType = itemTypeRaw === 'labor' || itemTypeRaw === 'other' ? itemTypeRaw : 'supply';

    return {
      name,
      description: String(row.description || row.designation || name),
      long_description: String(row.long_description || row.longDescription || row.details || '').trim() || undefined,
      item_type: itemType,
      category: String(row.category || '').trim() || undefined,
      subcategory: String(row.subcategory || '').trim() || undefined,
      trade: String(row.trade || '').trim() || undefined,
      unit: String(row.unit || 'u').trim() || 'u',
      unit_price: parseNumber(row.unit_price ?? row.unitPrice ?? row.pu_ht ?? row.pu ?? row.price, 0),
      tax_rate: parseNumber(row.tax_rate ?? row.taxRate ?? row.vat_rate ?? row.tva ?? 20, 20),
      reference: String(row.reference || row.ref || '').trim() || undefined,
      brand: String(row.brand || '').trim() || undefined,
      cost_price: parseNumber(row.cost_price ?? row.costPrice ?? '', 0) || undefined,
    };
  };

  const parseCsv = (text: string): Record<string, unknown>[] => {
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(';').length >= lines[0].split(',').length
      ? lines[0].split(';').map((h) => h.trim())
      : lines[0].split(',').map((h) => h.trim());
    const delimiter = lines[0].includes(';') ? ';' : ',';

    return lines.slice(1).map((line) => {
      const cols = line.split(delimiter).map((col) => col.trim());
      return headers.reduce<Record<string, unknown>>((acc, header, idx) => {
        acc[header] = cols[idx] ?? '';
        return acc;
      }, {});
    });
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setImportLoading(true);
    setImportMessage(null);
    try {
      const content = await file.text();
      const isJson = file.name.toLowerCase().endsWith('.json');
      let rawRows: unknown[] = [];
      if (isJson) {
        const parsed = JSON.parse(content);
        rawRows = Array.isArray(parsed) ? parsed : [];
      } else {
        rawRows = parseCsv(content);
      }

      const items = rawRows
        .map((row) => normalizeItem(row as Record<string, unknown>))
        .filter(Boolean) as PriceLibraryItemCreate[];

      if (!items.length) {
        setImportMessage('Aucune ligne valide à importer.');
        return;
      }

      const res = await priceLibraryService.importItems({
        items,
        upsert: true,
      });

      if (res.success && res.data) {
        const stats = res.data;
        setImportMessage(`Import terminé: ${stats.created} créés, ${stats.updated} mis à jour, ${stats.skipped} ignorés.`);
        await loadData();
      } else {
        setImportMessage('Import échoué.');
      }
    } catch (error) {
      console.error('Import error:', error);
      setImportMessage('Fichier invalide (JSON/CSV) ou format non reconnu.');
    } finally {
      setImportLoading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bibliothèque de prix</h1>
            <p className="text-gray-500">{items.length} élément(s) au total</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="inline-flex">
              <input
                type="file"
                accept=".json,.csv"
                className="hidden"
                onChange={handleImportFile}
              />
              <Button type="button" variant="outline" loading={importLoading}>
                Importer JSON/CSV
              </Button>
            </label>
            <Link href="/price-library/new">
              <Button>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nouvel élément
              </Button>
            </Link>
          </div>
        </div>

        {importMessage && (
          <Card>
            <CardContent className="p-3 text-sm text-gray-700">{importMessage}</CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Rechercher..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="w-full md:w-48">
                <Select
                  options={typeOptions}
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                />
              </div>
              <div className="w-full md:w-48">
                <Select
                  options={categoryOptions}
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items list */}
        <Card>
          <CardHeader>
            <CardTitle>Catalogue</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Désignation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Catégorie
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unité
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prix unitaire
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Utilisations
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      Aucun élément trouvé
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <button
                            onClick={() => handleToggleFavorite(item.id)}
                            className={`mr-2 ${item.is_favorite ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-400`}
                          >
                            <svg className="w-5 h-5" fill={item.is_favorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                          </button>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{item.name}</div>
                            {item.description && (
                              <div className="text-sm text-gray-500 truncate max-w-xs">{item.description}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.category || '-'}
                        {item.subcategory && (
                          <span className="text-gray-400"> / {item.subcategory}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge status={item.item_type} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.unit || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                        {item.usage_count || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleDuplicate(item.id)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          Dupliquer
                        </button>
                        <Link
                          href={buildEditPath('price-library', item.id)}
                          className="text-gray-600 hover:text-gray-900 mr-4"
                        >
                          Modifier
                        </Link>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
