export const paths = {
  home: '/',
  auth: { signIn: '/auth/sign-in' },
  dashboard: {
    overview: '/dashboard',
    organization: '/dashboard/organization',
    users: '/dashboard/users',
    positions: '/dashboard/positions',
    zones: '/dashboard/zones',
    suppliers: '/dashboard/suppliers',
    categories: '/dashboard/categories',
    products: '/dashboard/products',
    inventory: '/dashboard/inventory',
    inventoryZone: (id: string) => `/dashboard/inventory/${id}`,
    inventoryZoneHistory: (id: string) => `/dashboard/inventory/${id}/history`,
    inventorySession: (id: string) => `/dashboard/inventory/sessions/${id}`,
    myZones: '/dashboard/my-zones',
  },
} as const;
