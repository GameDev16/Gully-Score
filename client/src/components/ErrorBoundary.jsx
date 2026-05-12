import { Component } from "react";
import { Link } from "react-router-dom";

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("PitchDay ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center space-y-4">
          <div className="text-5xl">🏏</div>
          <h2 className="font-display text-2xl font-bold">Something went wrong</h2>
          <p className="text-slate-500 max-w-sm text-sm">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => this.setState({ error: null })}
              className="btn btn-outline"
            >
              Try again
            </button>
            <Link to="/" className="btn btn-primary">
              Go Home
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
