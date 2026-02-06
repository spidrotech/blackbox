'use client';

import Link from 'next/link';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Button, DataTable } from '@/components/ui';
import { ReactNode } from 'react';

export interface PageListProps<T extends Record<string, any>> {
  title: string;
  createLink: string;
  createLabel?: string;
  data: T[];
  loading?: boolean;
  error?: string;
  columns: Array<{
    key: keyof T;
    label: string;
    render?: (value: any, row: T) => React.ReactNode;
    width?: string;
  }>;
  onRowClick?: (row: T) => void;
  filters?: ReactNode;
  emptyMessage?: string;
}

export function PageList<T extends Record<string, any>>({
  title,
  createLink,
  createLabel = 'Nouveau',
  data,
  loading,
  error,
  columns,
  onRowClick,
  filters,
  emptyMessage,
}: PageListProps<T>) {
  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          <Link href={createLink}>
            <Button>+ {createLabel}</Button>
          </Link>
        </div>

        {/* Filters */}
        {filters && (
          <Card>
            <CardContent className="pt-6">
              {filters}
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Liste des {title.toLowerCase()}</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={data}
              loading={loading}
              emptyMessage={emptyMessage}
              onRowClick={onRowClick}
            />
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
