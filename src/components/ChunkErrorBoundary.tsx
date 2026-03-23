import React from 'react';

/**
 * Error boundary to catch dynamic-import chunk load failures and offer a reload.
 * This can happen when the application is redeployed and the browser tries to
 * fetch a chunk hash that no longer exists on the server.
 */
class ChunkErrorBoundary extends React.Component<{ fallback?: React.ReactNode; children: React.ReactNode }, { hasError: boolean; error: any }>{
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error: any) { 
    return { hasError: true, error }; 
  }
  
  componentDidCatch(error: any) { 
    try { 
      console.error('Chunk load failed:', error); 
    } catch {}
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 text-sm text-red-300 bg-red-900/30 border border-red-800 rounded">
          Failed to load module. This can happen after a rebuild. Please reload the page.
          <button
            onClick={() => window.location.reload()}
            className="ml-3 inline-flex items-center px-3 py-1 rounded bg-red-600 hover:bg-red-500 text-white"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children as any;
  }
}

export default ChunkErrorBoundary;
