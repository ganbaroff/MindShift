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
          style={{ background: 'var(--color-bg)' }}
        >
          <div className="text-5xl mb-6">🌿</div>
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
            Something went sideways
          </h2>
          <p className="text-sm mb-8 max-w-xs leading-relaxed" style={{ color: 'var(--color-muted)' }}>
            No worries — your data is safe. Let's get you back on track.
          </p>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              onClick={this.handleReset}
              className="w-full py-3.5 rounded-2xl font-semibold text-sm"
              style={{
                background: 'var(--color-primary-alpha)',
                border: '1.5px solid var(--color-primary)',
                color: 'var(--color-primary)',
              }}
            >
              Try again
            </button>
            <button
              onClick={this.handleGoHome}
              className="w-full py-3 rounded-2xl font-medium text-sm"
              style={{
                background: 'transparent',
                border: '1px solid var(--color-border-subtle)',
                color: 'var(--color-muted)',
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
