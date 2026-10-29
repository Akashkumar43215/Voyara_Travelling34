import React from "react";
import { Link } from "react-router-dom";
import { AlertCircle, SearchX } from "lucide-react";

// Empty and error panels. `action` is { label, to } (link) or { label, onClick } (button).
function Action({ label, to, onClick, primary }) {
  const cls = `btn ${primary ? "btn-primary" : "btn-outline"}`;
  return to ? (
    <Link to={to} className={cls}>{label}</Link>
  ) : (
    <button type="button" className={cls} onClick={onClick}>{label}</button>
  );
}

export function EmptyState({ title, text, action, secondary }) {
  return (
    <div className="v-state" role="status">
      <SearchX size={28} aria-hidden="true" />
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {(action || secondary) && (
        <div className="v-state-actions">
          {action && <Action {...action} primary />}
          {secondary && <Action {...secondary} />}
        </div>
      )}
    </div>
  );
}

export function ErrorState({ title, text, onRetry, retryLabel }) {
  return (
    <div className="v-state is-error" role="alert">
      <AlertCircle size={28} aria-hidden="true" />
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {onRetry && (
        <div className="v-state-actions">
          <Action label={retryLabel} onClick={onRetry} primary />
        </div>
      )}
    </div>
  );
}
