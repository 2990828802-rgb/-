import React, { ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-100 text-red-800 rounded-lg m-4">
          <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
          <pre className="text-sm overflow-auto max-h-[80vh]">
            {this.state.error?.toString()}
          </pre>
        </div>
      );
    }

    // @ts-ignore
    return this.props.children;
  }
}

export default ErrorBoundary;
