export type EditableEntity =
  | 'customers'
  | 'projects'
  | 'purchases'
  | 'suppliers'
  | 'equipment'
  | 'time-entries'
  | 'price-library'
  | 'quotes'
  | 'invoices';

export function buildEditPath(entity: EditableEntity, id: number | string): string {
  return `/${entity}/${id}/edit`;
}

export function buildDetailPath(entity: EditableEntity, id: number | string): string {
  return `/${entity}/${id}`;
}