const paths = {
  arrow: (
    <>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  code: (
    <>
      <path d="m8 9-3 3 3 3" />
      <path d="m16 9 3 3-3 3" />
      <path d="m14 5-4 14" />
    </>
  ),
  commit: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M3 12h6M15 12h6" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </>
  ),
  external: (
    <>
      <path d="M14 5h5v5" />
      <path d="m10 14 9-9" />
      <path d="M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6" />
    </>
  ),
  file: (
    <>
      <path d="M6 2h8l4 4v16H6z" />
      <path d="M14 2v5h5" />
    </>
  ),
  folder: (
    <>
      <path d="M3 6h6l2 2h10v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M3 10h18" />
    </>
  ),
  github: (
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3.3-.4 6.8-1.6 6.8-7.4A5.8 5.8 0 0 0 19.3 3 5.4 5.4 0 0 0 19.1 0S17.9-.4 15 1.5a14 14 0 0 0-6 0C6.1-.4 4.9 0 4.9 0a5.4 5.4 0 0 0-.2 3A5.8 5.8 0 0 0 3.2 7.1c0 5.8 3.5 7 6.8 7.4A4.8 4.8 0 0 0 9 18v4m0-3c-4.5 2-5-2-7-2" />
  ),
  key: (
    <>
      <circle cx="8" cy="15" r="4" />
      <path d="m11 12 9-9M17 6l3 3M14 9l3 3" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  minus: <path d="M5 12h14" />,
  pause: (
    <>
      <path d="M8 5v14M16 5v14" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  scan: (
    <>
      <path d="M4 7V4h3M17 4h3v3M20 17v3h-3M7 20H4v-3" />
      <path d="M7 12h10" />
    </>
  ),
  shield: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  spark: (
    <>
      <path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2z" />
      <path d="m18 14 .8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8z" />
      <path d="m5 13 .7 1.3L7 15l-1.3.7L5 17l-.7-1.3L3 15l1.3-.7z" />
    </>
  ),
  tray: (
    <>
      <rect x="3" y="4" width="18" height="14" rx="2" />
      <path d="M8 22h8M12 18v4" />
    </>
  ),
  windows: (
    <>
      <path d="M3 5.5 10.5 4v7H3zM12 3.7 21 2v9h-9zM3 12.5h7.5v7L3 18zM12 12.5h9v9L12 20z" />
    </>
  ),
};

export function Icon({ name, size = 20, className, strokeWidth = 1.8 }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
    >
      {paths[name]}
    </svg>
  );
}
