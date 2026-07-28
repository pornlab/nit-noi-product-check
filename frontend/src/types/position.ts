export interface Position {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  usersCount: number;
  createdAt: string;
  updatedAt: string;
}
