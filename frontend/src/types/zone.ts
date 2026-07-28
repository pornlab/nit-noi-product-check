export interface Zone {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  usersCount: number;
  responsibleCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ZoneAssignment {
  userId: string;
  name: string;
  email: string;
  isResponsible: boolean;
}

export interface ZoneDetail extends Zone {
  assignments: ZoneAssignment[];
}
