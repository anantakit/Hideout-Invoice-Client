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
    detail: (id: string) => `/bookings/${id}`,
  },

  operations: {
    today: '/operations/today',
  },

  admin: {
    users: '/admin/users',
    rooms: '/admin/rooms',
  },
} as const
