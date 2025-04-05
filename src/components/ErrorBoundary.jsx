import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-50 p-4 rounded-lg text-center h-full flex flex-col items-center justify-center">
          <p className="text-red-800 mb-4">
            {this.props.errorMessage || "Something went wrong"}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              if (this.props.onRetry) this.props.onRetry();
            }}
            className="bg-red-100 text-red-800 px-4 py-2 rounded-md hover:bg-red-200"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
