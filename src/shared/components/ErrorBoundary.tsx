import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import ErrorPage from './ErrorPage'

interface Props {
  children: ReactNode
  /** Change this key to reset the boundary and re-mount children. */
  resetKey?: string | number
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * React Error Boundary — catches render-time crashes and shows
 * a full-page error with recovery actions instead of a white screen.
 *
 * Supports two recovery strategies:
 *   1. User clicks "ลองใหม่" → calls window.location.reload()
 *   2. Parent changes `resetKey` → boundary resets and re-mounts children
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
     
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null })
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorPage
          variant="error"
          title="เกิดข้อผิดพลาดที่ไม่คาดคิด"
          description="ส่วนนี้ของระบบหยุดทำงาน กรุณาโหลดหน้าใหม่"
          detail={this.state.error?.message}
        />
      )
    }
    return this.props.children
  }
}
