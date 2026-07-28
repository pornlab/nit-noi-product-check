export interface Supplier {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  taxId: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupplierPayload {
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  taxId?: string | null;
  notes?: string | null;
}

export interface UpdateSupplierPayload extends Partial<CreateSupplierPayload> {
  isActive?: boolean;
}

export interface SupplierFilters {
  search?: string;
  isActive?: boolean;
}
