import React from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import App from './app/router'
import QueryProvider from './app/providers/QueryProvider'
import ErrorBoundary from './shared/components/ErrorBoundary'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryProvider>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'hsl(224 16% 14%)',
              color: 'hsl(220 14% 92%)',
              border: '1px solid hsl(224 12% 22%)',
              borderRadius: '8px',
              fontSize: '13px',
              padding: '12px 16px',
            },
            success: {
              style: { borderLeft: '3px solid hsl(150 45% 44%)' },
              iconTheme: { primary: 'hsl(150 45% 44%)', secondary: 'hsl(0 0% 100%)' },
            },
            error: {
              style: { borderLeft: '3px solid hsl(0 50% 55%)' },
              iconTheme: { primary: 'hsl(0 50% 55%)', secondary: 'hsl(0 0% 100%)' },
            },
          }}
        />
      </QueryProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
