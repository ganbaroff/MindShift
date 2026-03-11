import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { logError } from '@/shared/lib/logger'

interface Props {
  children: ReactNode
  fallbackRoute?: string
  /** Custom fallback UI for per-route error boundaries */
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logError('ErrorBoundary.componentDidCatch', error, {
      componentStack: info.componentStack ?? 'unknown',
    })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  handleGoHome = () => {
    this.setState({ hasError: false, error: null })
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      // If a custom fallback was provided, render it instead of the default UI
      if (this.props.fallback) return this.props.fallback

      return (
        <div
          className="flex flex-col items-center justify-center min-h-screen px-6 text-center"
          style={{ background: '#0F1117' }}
        >
          <div className="text-5xl mb-6">🌿</div>
          <h2 className="text-xl font-bold mb-2" style={{ color: '#E8E8F0' }}>
            Something went sideways
          </h2>
          <p className="text-sm mb-8 max-w-xs leading-relaxed" style={{ color: '#8B8BA7' }}>
            No worries — your data is safe. Let's get you back on track.
          </p>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              onClick={this.handleReset}
              className="w-full py-3.5 rounded-2xl font-semibold text-sm"
              style={{
                background: 'rgba(123,114,255,0.15)',
                border: '1.5px solid #7B72FF',
                color: '#7B72FF',
              }}
            >
              Try again
            </button>
            <button
              onClick={this.handleGoHome}
              className="w-full py-3 rounded-2xl font-medium text-sm"
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.06)',
                color: '#8B8BA7',
              }}
            >
              Go home
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
