import { Link } from 'react-router-dom';

export function Logo({ className = '' }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-2 ${className}`}>
      <svg width="32" height="32" viewBox="0 0 64 64" fill="none" className="shrink-0">
        <rect width="64" height="64" rx="16" className="fill-accent" />
        <path
          d="M32 14 L50 23 L50 41 L32 50 L14 41 L14 23 Z"
          stroke="white"
          strokeWidth="2.5"
          fill="none"
          strokeLinejoin="round"
        />
        <path d="M32 14 L32 50 M14 23 L50 41 M50 23 L14 41" stroke="white" strokeWidth="1.5" opacity="0.45" />
        <circle cx="32" cy="32" r="5" className="fill-primary" />
      </svg>
      <span className="font-display text-lg font-semibold tracking-tight text-foreground">
        ProjectBridge
      </span>
    </Link>
  );
}
