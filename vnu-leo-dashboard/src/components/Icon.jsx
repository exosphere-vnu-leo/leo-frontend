function Icon({ name = "dot", size = 24, className = "" }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
  };

  const icons = {
    activity: <><path d="M3 12h4l3-8 4 16 3-8h4" /></>,
    alert: <><path d="M12 3 22 20H2L12 3Z" /><path d="M12 9v5" /><path d="M12 17h.01" /></>,
    antenna: <><path d="M12 14a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" /><path d="M12 14v7" /><path d="M8 21h8" /><path d="M5 5a10 10 0 0 0 0 14" /><path d="M19 5a10 10 0 0 1 0 14" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3c3 3 3 15 0 18" /><path d="M12 3c-3 3-3 15 0 18" /></>,
    home: <><path d="M3 11 12 4l9 7" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" /></>,
    radio: <><circle cx="12" cy="12" r="2" /><path d="M8.5 8.5a5 5 0 0 0 0 7" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M5.5 5.5a9 9 0 0 0 0 13" /><path d="M18.5 5.5a9 9 0 0 1 0 13" /></>,
    router: <><rect x="4" y="10" width="16" height="8" rx="2" /><path d="M8 14h.01" /><path d="M12 14h.01" /><path d="M16 14h.01" /><path d="M8 10 6 5" /><path d="M16 10l2-5" /></>,
    satellite: <><path d="m12 12 3 3" /><path d="m9 9 3 3" /><rect x="9" y="9" width="6" height="6" rx="1" transform="rotate(45 12 12)" /><path d="M5 6 2 3" /><path d="M3 8 8 3" /><path d="m19 18 3 3" /><path d="m16 21 5-5" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.1 2.1-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V20h-3v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-2.1-2.1.1-.1A1.7 1.7 0 0 0 5 15a1.7 1.7 0 0 0-1.5-1H3v-3h.5A1.7 1.7 0 0 0 5 10a1.7 1.7 0 0 0-.3-1.9l-.1-.1L6.7 5.9l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V4h3v.8a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1L18 8l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.9v3h-.6a1.7 1.7 0 0 0-1.5 1Z" /></>,
    wifi: <><path d="M5 13a10 10 0 0 1 14 0" /><path d="M8.5 16.5a5 5 0 0 1 7 0" /><path d="M12 20h.01" /></>,
  };

  return <svg {...common}>{icons[name] || <circle cx="12" cy="12" r="4" />}</svg>;
}

export default Icon;