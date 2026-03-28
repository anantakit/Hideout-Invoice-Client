import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'

/**
 * Creates a wrapper component with a fresh QueryClient for testing hooks.
 * Disables retries so tests fail fast on errors.
 */
export function createQueryWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return function QueryWrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}
