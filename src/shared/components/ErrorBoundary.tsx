import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import ErrorPage from './ErrorPage'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * React Error Boundary — catches render-time crashes and shows
 * a full-page error with recovery actions instead of a white screen.
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
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info.componentStack)
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
