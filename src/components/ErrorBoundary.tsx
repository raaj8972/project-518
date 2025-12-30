import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
    
    // Log to external service if needed
    // logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Check for network/chunk errors
      const isChunkError = this.state.error?.message?.includes('Failed to fetch dynamically imported module') || 
                           this.state.error?.message?.includes('Importing a module script failed') ||
                           this.state.error?.message?.toLowerCase().includes('network');
      
      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

      if (isChunkError || isOffline) {
        return (
          <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-6 border border-gray-700">
              <div className="relative">
                <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full"></div>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-gray-400 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">You're Offline</h1>
            <p className="text-gray-400 mb-8 max-w-md">
              We couldn't connect to the server. Please check your internet connection and try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-cyan-500/20"
            >
              Try Again
            </button>
          </div>
        );
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-gray-800/50 backdrop-blur-lg rounded-2xl p-8 border border-red-500/30 shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
                <AlertTriangle className="w-10 h-10 text-red-500" />
              </div>
              
              <h1 className="text-3xl font-bold text-white mb-3">
                Oops! Something went wrong
              </h1>
              
              <p className="text-gray-400 mb-6">
                We encountered an unexpected error. Don't worry, your data is safe.
              </p>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="w-full mb-6 text-left">
                  <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-300 mb-2">
                    Error Details (Dev Mode)
                  </summary>
                  <div className="bg-black/50 p-4 rounded-lg text-xs text-red-400 font-mono overflow-auto max-h-40">
                    <p className="font-bold mb-2">{this.state.error.toString()}</p>
                    {this.state.errorInfo && (
                      <pre className="whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                </details>
              )}

              <div className="flex gap-3 w-full">
                <button
                  onClick={this.handleReset}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  <RefreshCw size={18} />
                  Try Again
                </button>
                
                <button
                  onClick={this.handleGoHome}
                  className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <Home size={18} />
                  Go Home
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
