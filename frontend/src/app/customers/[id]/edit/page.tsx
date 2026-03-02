'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Select } from '@/components/ui';
import { AddressAutocomplete, AddressResult } from '@/components/ui/AddressAutocomplete';
import { customerService } from '@/services/api';
import { Customer, CustomerType } from '@/types';
import { buildDetailPath } from '@/lib/routes';

interface CustomerFormData extends Record<string, unknown> {
  customer_type: CustomerType;
  company_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  siret?: string;
  vat_number?: string;
  notes?: string;
  billing_street?: string;
  billing_city?: string;
  billing_postal_code?: string;
  billing_country?: string;
  is_active?: boolean;
}

export default function EditCustomerPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<CustomerFormData>({
    customer_type: 'individual',
    company_name: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    mobile: '',
    siret: '',
    vat_number: '',
    notes: '',
    billing_street: '',
    billing_city: '',
    billing_postal_code: '',
    billing_country: '',
    is_active: true,
  });

  useEffect(() => {
    const loadCustomer = async () => {
      try {
        setLoading(true);
        const response = await customerService.getById(parseInt(customerId));
        if (response.success && response.data) {
          const customerData = response.data as Customer;
          setFormData({
            customer_type: customerData.type || 'individual',
            company_name: customerData.name || '',
            first_name: customerData.firstName || '',
            last_name: customerData.lastName || '',
            email: customerData.email || '',
            phone: customerData.phone || '',
            mobile: customerData.mobile || '',
            siret: customerData.siret || '',
            vat_number: customerData.vat || '',
            notes: customerData.notes || '',
            billing_street: customerData.billingAddress?.street || customerData.address?.street || '',
            billing_city: customerData.billingAddress?.city || customerData.address?.city || '',
            billing_postal_code: customerData.billingAddress?.postal_code || customerData.address?.postal_code || '',
            billing_country: customerData.billingAddress?.country || customerData.address?.country || '',
            is_active: customerData.isActive ?? true,
          });
        } else {
          setError('Client non trouvé');
        }
      } catch (err) {
        setError('Erreur lors du chargement du client');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadCustomer();
  }, [customerId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const target = e.target;
    const { name } = target;
    const value = target instanceof HTMLInputElement && target.type === 'checkbox'
      ? target.checked
      : target.value;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const response = await customerService.update(parseInt(customerId), formData as Record<string, unknown>);
      if (response.success) {
        router.push(buildDetailPath('customers', customerId));
      } else {
        setError(response.message || 'Erreur lors de la sauvegarde');
      }
    } catch (err) {
      setError('Erreur lors de la sauvegarde du client');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <p>Chargement...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Modifier le client</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Select
                label="Type de client"
                name="customer_type"
                value={formData.customer_type}
                onChange={handleChange}
                options={[
                  { value: 'individual', label: 'Particulier' },
                  { value: 'company', label: 'Entreprise' },
                ]}
              />

              {formData.customer_type === 'company' && (
                <Input
                  label="Raison sociale"
                  name="company_name"
                  value={formData.company_name || ''}
                  onChange={handleChange}
                  required={formData.customer_type === 'company'}
                />
              )}

              {formData.customer_type === 'individual' && (
                <>
                  <Input
                    label="Prénom"
                    name="first_name"
                    value={formData.first_name || ''}
                    onChange={handleChange}
                    required={formData.customer_type === 'individual'}
                  />
                  <Input
                    label="Nom"
                    name="last_name"
                    value={formData.last_name || ''}
                    onChange={handleChange}
                    required={formData.customer_type === 'individual'}
                  />
                </>
              )}

              <Input
                label="Email"
                name="email"
                type="email"
                value={formData.email || ''}
                onChange={handleChange}
              />

              <Input
                label="Téléphone"
                name="phone"
                value={formData.phone || ''}
                onChange={handleChange}
              />

              <Input
                label="Mobile"
                name="mobile"
                value={formData.mobile || ''}
                onChange={handleChange}
              />

              {formData.customer_type === 'company' && (
                <>
                  <Input
                    label="SIRET"
                    name="siret"
                    value={formData.siret || ''}
                    onChange={handleChange}
                  />

                  <Input
                    label="Numéro TVA"
                    name="vat_number"
                    value={formData.vat_number || ''}
                    onChange={handleChange}
                  />
                </>
              )}

              <AddressAutocomplete
                label="Rue"
                placeholder="Saisissez une adresse..."
                value={formData.billing_street || ''}
                onChange={(val) => setFormData((prev) => ({ ...prev, billing_street: val }))}
                onSelect={(r: AddressResult) =>
                  setFormData((prev) => ({
                    ...prev,
                    billing_street: r.street,
                    billing_city: r.city,
                    billing_postal_code: r.postalCode,
                    billing_country: r.country,
                  }))
                }
              />

              <div className="grid grid-cols-5 gap-2">
                <div className="col-span-2">
                  <Input
                    label="Code postal"
                    name="billing_postal_code"
                    value={formData.billing_postal_code || ''}
                    onChange={handleChange}
                  />
                </div>
                <div className="col-span-3">
                  <Input
                    label="Ville"
                    name="billing_city"
                    value={formData.billing_city || ''}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <Input
                label="Pays"
                name="billing_country"
                value={formData.billing_country || ''}
                onChange={handleChange}
              />

              <div className="form-group">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active ?? true}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  <span>Actif</span>
                </label>
              </div>

              <div className="form-group">
                <label htmlFor="notes">Notes</label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes || ''}
                  onChange={handleChange}
                  className="w-full border rounded p-2"
                  rows={4}
                />
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={saving}>
                  {saving
                    ? 'Enregistrement...'
                    : 'Enregistrer les modifications'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(buildDetailPath('customers', customerId))}
                >
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}