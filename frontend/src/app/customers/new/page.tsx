'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Select } from '@/components/ui';
import { customerService } from '@/services/api';
import { CustomerCreate, CustomerType } from '@/types';

const customerTypeOptions = [
  { value: 'individual', label: 'Particulier' },
  { value: 'company', label: 'Entreprise' },
];

export default function NewCustomerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CustomerCreate>({
    customer_type: 'individual',
    first_name: '',
    last_name: '',
    company_name: '',
    email: '',
    phone: '',
    mobile: '',
    siret: '',
    vat_number: '',
    notes: '',
    billing_address: {
      street: '',
      city: '',
      postal_code: '',
      country: 'France',
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith('billing_')) {
      const field = name.replace('billing_', '');
      setFormData(prev => ({
        ...prev,
        billing_address: {
          ...prev.billing_address,
          [field]: value,
        },
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await customerService.create(formData);
      if (response.success) {
        router.push('/customers');
      }
    } catch (error) {
      console.error('Error creating customer:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nouveau client</h1>
          <p className="text-gray-500">Créer un nouveau client</p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                label="Type de client"
                name="customer_type"
                options={customerTypeOptions}
                value={formData.customer_type}
                onChange={handleChange}
              />

              {formData.customer_type === 'company' ? (
                <>
                  <Input
                    label="Raison sociale"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleChange}
                    required
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="SIRET"
                      name="siret"
                      value={formData.siret}
                      onChange={handleChange}
                    />
                    <Input
                      label="N° TVA"
                      name="vat_number"
                      value={formData.vat_number}
                      onChange={handleChange}
                    />
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Prénom"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    required
                  />
                  <Input
                    label="Nom"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                />
                <Input
                  label="Téléphone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>

              <Input
                label="Mobile"
                name="mobile"
                value={formData.mobile}
                onChange={handleChange}
              />
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Adresse de facturation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Adresse"
                name="billing_street"
                value={formData.billing_address?.street}
                onChange={handleChange}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Code postal"
                  name="billing_postal_code"
                  value={formData.billing_address?.postal_code}
                  onChange={handleChange}
                />
                <Input
                  label="Ville"
                  name="billing_city"
                  value={formData.billing_address?.city}
                  onChange={handleChange}
                />
              </div>
              <Input
                label="Pays"
                name="billing_country"
                value={formData.billing_address?.country}
                onChange={handleChange}
              />
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                name="notes"
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Notes internes..."
              />
            </CardContent>
          </Card>

          <div className="mt-6 flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/customers')}
            >
              Annuler
            </Button>
            <Button type="submit" loading={loading}>
              Créer le client
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
