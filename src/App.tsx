import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import ChangePassword from './pages/ChangePassword'

// Heavy pages are lazy-loaded so the initial bundle stays small.
const Dashboard     = lazy(() => import('./pages/Dashboard'))
const CreateInvoice = lazy(() => import('./pages/CreateInvoice'))
const InvoiceHistory = lazy(() => import('./pages/InvoiceHistory'))
const InvoiceDetail = lazy(() => import('./pages/InvoiceDetail'))
const Customers     = lazy(() => import('./pages/Customers'))
const AdminUsers    = lazy(() => import('./pages/AdminUsers'))

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
