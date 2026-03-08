import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { logError } from '@/shared/lib/logger'

interface Props {
  children: ReactNode
  fallbackRoute?: string
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
                background: 'rgba(108,99,255,0.15)',
                border: '1.5px solid #6C63FF',
                color: '#6C63FF',
              }}
            >
              Try again
            </button>
            <button
              onClick={this.handleGoHome}
              className="w-full py-3 rounded-2xl font-medium text-sm"
              style={{
                background: 'transparent',
                border: '1.5px solid #2D3150',
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
