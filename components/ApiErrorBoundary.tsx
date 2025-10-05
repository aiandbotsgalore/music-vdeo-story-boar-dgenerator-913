// FIX: Refactored to use named imports from React to resolve a type issue with class components.
import React, { Component, ErrorInfo, ReactNode } from 'react';
import ErrorScreen from './ErrorScreen';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ApiErrorBoundary extends Component<Props, State> {
  // FIX: Added a constructor to explicitly initialize state and props, resolving a TypeScript error where `this.props` was not recognized on the class instance.
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can also log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorScreen error={this.state.error} />;
    }

    return this.props.children;
  }
}

export default ApiErrorBoundary;
