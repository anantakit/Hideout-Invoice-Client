export const ROUTES = {
  dashboard: '/dashboard',

  receipts: {
    list: '/receipts',
    new: '/receipts/new',
    detail: (id: string) => `/receipts/${id}`,
  },

  customers: '/customers',

  bookings: {
    list: '/bookings',
    new: '/bookings/new',
    walkin: '/bookings/new?mode=walkin',
    detail: (id: string) => `/bookings/${id}`,
  },

  operations: {
    today: '/operations/today',
  },

  occupancy: {
    month: '/occupancy/month',
  },

  admin: {
    users: '/admin/users',
  },
} as const
