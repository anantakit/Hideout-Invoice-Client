import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './providers/AuthProvider'
import ProtectedRoute from '../shared/components/ProtectedRoute'
import Layout from '../shared/components/Layout'
import Login from '../features/auth/pages/LoginPage'
import ChangePassword from '../features/auth/pages/ChangePasswordPage'

// Heavy pages are lazy-loaded so the initial bundle stays small.
const Dashboard      = lazy(() => import('../features/dashboard/pages/DashboardPage'))
const CreateReceipt  = lazy(() => import('../features/receipts/pages/CreateReceiptPage'))
const ReceiptHistory = lazy(() => import('../features/receipts/pages/ReceiptHistoryPage'))
const ReceiptDetail  = lazy(() => import('../features/receipts/pages/ReceiptDetailPage'))
const Customers      = lazy(() => import('../features/customers/pages/CustomersPage'))
const AdminUsers     = lazy(() => import('../features/users/pages/AdminUsersPage'))
const CreateBooking     = lazy(() => import('../features/bookings/pages/CreateBookingPage'))
const BookingList       = lazy(() => import('../features/bookings/pages/BookingListPage'))
const BookingDetail     = lazy(() => import('../features/bookings/pages/BookingDetailPage'))
const GroupCheckIn      = lazy(() => import('../features/bookings/pages/GroupCheckInPage'))
const Timeline          = lazy(() => import('../features/bookings/pages/TimelinePage'))
const TodayBoard        = lazy(() => import('../features/operations/pages/TodayBoardPage'))
const MonthlyOccupancy  = lazy(() => import('../features/operations/pages/MonthlyOccupancyPage'))

function PageLoader() {
  return (
    <div className="flex justify-center items-center h-64">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
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
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/receipts/new" element={<CreateReceipt />} />
              <Route path="/receipts" element={<ReceiptHistory />} />
              <Route path="/receipts/:id" element={<ReceiptDetail />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/bookings" element={<BookingList />} />
              <Route path="/bookings/new" element={<CreateBooking />} />
              <Route path="/bookings/timeline" element={<Timeline />} />
              <Route path="/bookings/:id/checkin" element={<GroupCheckIn />} />
              <Route path="/bookings/:id" element={<BookingDetail />} />
              <Route path="/operations/today" element={<TodayBoard />} />
              <Route path="/occupancy/month" element={<MonthlyOccupancy />} />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminUsers />
                  </ProtectedRoute>
                }
              />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
}
