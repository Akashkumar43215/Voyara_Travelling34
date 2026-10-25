import React from "react";

import { tg } from "../i18n/runtime";
/**
 * Catches a crash in any page so visitors see a friendly message with a way
 * back, instead of a blank white screen.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    // Visible in the browser console for debugging; a monitoring service could be hooked in here
    console.error("Page crashed:", error, info?.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <div className="app-error">
        <div>
          <h1>{tg("Something went wrong")}</h1>
          <p>{tg("We hit an unexpected problem loading this page. Your trip details are safe.")}</p>

          <div className="app-error-actions">
            <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
              {tg("Reload the page")}
            </button>

            <a className="btn btn-outline" href="/">
              {tg("Go to home")}
            </a>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
