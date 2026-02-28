import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './providers/AuthProvider'
import ProtectedRoute from '../shared/components/ProtectedRoute'
import Layout from '../shared/components/Layout'
import Login from '../features/auth/pages/LoginPage'
import ChangePassword from '../features/auth/pages/ChangePasswordPage'

// Heavy pages are lazy-loaded so the initial bundle stays small.
const Dashboard     = lazy(() => import('../features/dashboard/pages/DashboardPage'))
const CreateInvoice = lazy(() => import('../features/receipts/pages/CreateReceiptPage'))
const InvoiceHistory = lazy(() => import('../features/receipts/pages/InvoiceHistoryPage'))
const InvoiceDetail = lazy(() => import('../features/receipts/pages/ReceiptDetailPage'))
const Customers     = lazy(() => import('../features/customers/pages/CustomersPage'))
const AdminUsers    = lazy(() => import('../features/users/pages/AdminUsersPage'))

function PageLoader() {
  return (
    <div className="flex justify-center items-center h-64">
      <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
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
              <Route path="/invoices/new" element={<CreateInvoice />} />
              <Route path="/invoices" element={<InvoiceHistory />} />
              <Route path="/invoices/:id" element={<InvoiceDetail />} />
              <Route path="/customers" element={<Customers />} />
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
