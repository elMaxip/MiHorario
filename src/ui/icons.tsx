const base = {
  width: 20,
  height: 20,
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.5,
  "aria-hidden": true,
} as const;

export const ChevronLeft = () => (
  <svg {...base}>
    <path d="M12.5 4l-6 6 6 6" />
  </svg>
);

export const ChevronRight = () => (
  <svg {...base}>
    <path d="M7.5 4l6 6-6 6" />
  </svg>
);

export const DownloadIcon = () => (
  <svg {...base}>
    <path d="M10 2.5v10M5.5 8.5l4.5 4.5 4.5-4.5M3 17.5h14" />
  </svg>
);
