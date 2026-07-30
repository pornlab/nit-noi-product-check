import { apiRequest } from './http';
import type {
  CreateReceivingInput,
  ReceivingDetail,
  ReceivingSummary,
} from '@/types/receiving';

export const receivingsApi = {
  list: () => apiRequest<ReceivingSummary[]>('/receivings'),
  get: (id: string) => apiRequest<ReceivingDetail>(`/receivings/${id}`),
  create: (input: CreateReceivingInput) =>
    apiRequest<ReceivingDetail>('/receivings', { method: 'POST', body: input }),
  update: (id: string, input: CreateReceivingInput) =>
    apiRequest<ReceivingDetail>(`/receivings/${id}`, { method: 'PATCH', body: input }),
  remove: (id: string) => apiRequest<void>(`/receivings/${id}`, { method: 'DELETE' }),
};
