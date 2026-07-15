import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', backgroundColor: '#3f0000', color: 'white', fontFamily: 'monospace', minHeight: '100vh', zIndex: 9999, position: 'relative' }}>
          <h1>React Crashed!</h1>
          <p><strong>Error:</strong> {this.state.error && this.state.error.toString()}</p>
          <details open style={{ whiteSpace: 'pre-wrap', marginTop: '1rem', backgroundColor: 'rgba(0,0,0,0.5)', padding: '1rem' }}>
            <summary style={{ cursor: 'pointer', marginBottom: '0.5rem' }}>Stack Trace</summary>
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}
