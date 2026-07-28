export const paths = {
  home: '/',
  auth: { signIn: '/auth/sign-in' },
  dashboard: {
    overview: '/dashboard',
    organization: '/dashboard/organization',
    users: '/dashboard/users',
    positions: '/dashboard/positions',
    zones: '/dashboard/zones',
    myZones: '/dashboard/my-zones',
  },
} as const;
