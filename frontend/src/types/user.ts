export type UserRole = 'admin' | 'manager' | 'employee';

export interface UserZoneRef {
  id: string;
  name: string;
  isResponsible: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  organizationId: string;
  positionId: string | null;
  createdAt?: string;
  updatedAt?: string;
  organization?: { id: string; name: string };
  position?: { id: string; name: string } | null;
  zones?: UserZoneRef[];

  [key: string]: unknown;
}
