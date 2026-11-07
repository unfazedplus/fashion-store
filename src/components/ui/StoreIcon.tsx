interface StoreIconProps {
  name: "account" | "arrow" | "bag" | "chevron" | "close" | "heart" | "menu" | "search";
  className?: string;
  filled?: boolean;
}

function StoreIcon({ name, className = "h-5 w-5", filled = false }: StoreIconProps) {
  const commonProps = {
    className,
    viewBox: "0 0 24 24",
    fill: filled ? "currentColor" : "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "menu") {
    return <svg {...commonProps}><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
  }
  if (name === "close") {
    return <svg {...commonProps}><path d="m6 6 12 12M18 6 6 18" /></svg>;
  }
  if (name === "search") {
    return <svg {...commonProps}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>;
  }
  if (name === "heart") {
    return <svg {...commonProps}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" /></svg>;
  }
  if (name === "account") {
    return <svg {...commonProps}><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.6-4 3-6 7-6s6.4 2 7 6" /></svg>;
  }
  if (name === "bag") {
    return <svg {...commonProps}><path d="M5 8h14l-1 12H6L5 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></svg>;
  }
  if (name === "arrow") {
    return <svg {...commonProps}><path d="M5 12h14M14 7l5 5-5 5" /></svg>;
  }
  return <svg {...commonProps}><path d="m7 10 5 5 5-5" /></svg>;
}

export default StoreIcon;
