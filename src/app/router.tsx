import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './providers/AuthProvider'
import { ThemeProvider } from './providers/ThemeProvider'
import ProtectedRoute from '../shared/components/ProtectedRoute'
import Layout from '../shared/components/Layout'
import ErrorPage from '../shared/components/ErrorPage'
import { Skeleton } from '../shared/ui/skeleton'
import Login from '../features/auth/pages/LoginPage'
import ChangePassword from '../features/auth/pages/ChangePasswordPage'

// Heavy pages are lazy-loaded so the initial bundle stays small.
const Dashboard      = lazy(() => import('../features/dashboard/pages/DashboardPage'))
const CreateReceipt  = lazy(() => import('../features/receipts/pages/CreateReceiptPage'))
const ReceiptHistory = lazy(() => import('../features/receipts/pages/ReceiptHistoryPage'))
const ReceiptDetail  = lazy(() => import('../features/receipts/pages/ReceiptDetailPage'))
const Customers      = lazy(() => import('../features/customers/pages/CustomersPage'))
const AdminUsers     = lazy(() => import('../features/users/pages/AdminUsersPage'))
const AdminRooms     = lazy(() => import('../features/rooms/pages/AdminRoomsPage'))
const CreateBooking     = lazy(() => import('../features/bookings/pages/CreateBookingPage'))
const BookingList       = lazy(() => import('../features/bookings/pages/BookingListPage'))
const BookingDetail     = lazy(() => import('../features/bookings/pages/BookingDetailPage'))
const Timeline          = lazy(() => import('../features/bookings/pages/TimelinePage'))

function PageLoader() {
  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
      <Skeleton className="h-48 rounded-xl" />
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public */}
              <Route path="/login" element={<Login />} />
              <Route
                path="/change-password"
                element={
                  <ProtectedRoute>
                    <ChangePassword />
                  </ProtectedRoute>
                }
              />

              {/* Protected app shell */}
              <Route
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/timeline" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/receipts/new" element={<CreateReceipt />} />
                <Route path="/receipts" element={<ReceiptHistory />} />
                <Route path="/receipts/:id" element={<ReceiptDetail />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/bookings" element={<BookingList />} />
                <Route path="/bookings/new" element={<CreateBooking />} />
                <Route path="/timeline" element={<Timeline />} />
                <Route path="/bookings/:id" element={<BookingDetail />} />
                <Route
                  path="/admin/users"
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <AdminUsers />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/rooms"
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <AdminRooms />
                    </ProtectedRoute>
                  }
                />
              </Route>

              {/* 404 catch-all */}
              <Route path="*" element={<ErrorPage variant="not-found" />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
