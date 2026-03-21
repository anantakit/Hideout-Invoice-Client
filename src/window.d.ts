export {}

declare global {
  interface Window {
    __splashCleanup?: () => void
  }
}
