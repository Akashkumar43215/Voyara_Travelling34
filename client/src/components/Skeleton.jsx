import React from "react";

// Grey placeholder block shown while data loads. Size it with width/height props or className.
export default function Skeleton({ width = "100%", height = "1rem", plate = false, className = "" }) {
  return (
    <span
      className={`v-skel${plate ? " plate" : ""} ${className}`.trim()}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}
