import { apiRequest } from './http';
import type { Organization } from '@/types/organization';

export const organizationsApi = {
  get: () => apiRequest<Organization>('/organization'),
  update: (input: { name?: string; description?: string | null }) =>
    apiRequest<Organization>('/organization', { method: 'PATCH', body: input }),
};
