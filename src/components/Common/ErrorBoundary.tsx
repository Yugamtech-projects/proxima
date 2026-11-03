import React, { Component, type ReactNode } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallbackTitle?: string
  onReset?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary caught error]:', error, errorInfo)
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null })
    if (this.props.onReset) {
      this.props.onReset()
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in select-none">
          <div className="bg-white w-full max-w-[400px] rounded-[32px] p-6 shadow-2xl border border-slate-100 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-display text-base font-bold text-slate-900">
                {this.props.fallbackTitle || 'Session Refresh Needed'}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                The interface encountered a temporary synchronization glitch. Tap below to refresh the modal view.
              </p>
            </div>
            <button
              type="button"
              onClick={this.handleReset}
              className="w-full h-10 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restore Session</span>
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
