/**
 * skeleton/ErrorBoundary.jsx
 * React class-based error boundary — catches render crashes.
 *
 * Exports: ErrorBoundary
 *
 * Bolt 1.7: extracted from mindflow.jsx lines 57–77.
 */

import { Component } from "react";
import { logError }  from "../shared/lib/logger.js";

export class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { logError("ErrorBoundary", error, { componentStack: info?.componentStack }); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: "#07070D", padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🧠</div>
          <div style={{ color: "#F0F0F8", fontSize: 18, fontWeight: 700, marginBottom: 8, fontFamily: "Syne, sans-serif" }}>Something went wrong</div>
          <div style={{ color: "#6868A0", fontSize: 13, marginBottom: 24 }}>{this.state.error?.message || "Unexpected error"}</div>
          <button onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            style={{ background: "#6C5CE7", color: "white", border: "none", borderRadius: 12, padding: "10px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Reload app
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
