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
    myZones: '/dashboard/my-zones',
  },
} as const;
