export function LoadingScreen({ message = 'Loading…' }: { message?: string }) {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#070d1b] via-[#0a1226] to-[#0d1a35] px-6 text-center">
      {/* Animated gradient orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-1/4 h-96 w-96 animate-pulse rounded-full bg-teal-500/15 blur-3xl" />
        <div
          className="absolute -right-32 bottom-1/4 h-96 w-96 animate-pulse rounded-full bg-cyan-400/12 blur-3xl"
          style={{ animationDelay: '0.8s' }}
        />
        <div
          className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-teal-600/10 blur-2xl"
          style={{ animationDelay: '1.4s' }}
        />
      </div>

      {/* Subtle grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Orbiting rings + logo */}
      <div className="relative z-10 flex flex-col items-center gap-8">
        <div className="relative flex h-28 w-28 items-center justify-center">
          {/* Outer rotating ring */}
          <svg
            className="absolute inset-0 h-full w-full animate-spin-slow"
            viewBox="0 0 112 112"
            fill="none"
          >
            <circle
              cx="56"
              cy="56"
              r="52"
              stroke="url(#ringGrad)"
              strokeWidth="1.5"
              strokeDasharray="78 248"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="ringGrad" x1="0" y1="0" x2="112" y2="112">
                <stop offset="0%" stopColor="#2dd4bf" />
                <stop offset="100%" stopColor="#0891b2" />
              </linearGradient>
            </defs>
          </svg>

          {/* Inner counter-rotating ring */}
          <svg
            className="absolute inset-3 h-[88px] w-[88px] animate-spin-reverse"
            viewBox="0 0 88 88"
            fill="none"
          >
            <circle
              cx="44"
              cy="44"
              r="40"
              stroke="rgba(45,212,191,0.3)"
              strokeWidth="1"
              strokeDasharray="12 238"
              strokeLinecap="round"
            />
          </svg>

          {/* Pulsing glow */}
          <span className="absolute inset-0 animate-ping rounded-full bg-teal-500/10" />

          {/* Center logo mark */}
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-600 shadow-lg shadow-teal-500/30">
            <svg width="26" height="26" viewBox="0 0 64 64" fill="none">
              <path
                d="M32 14 L50 23 L50 41 L32 50 L14 41 L14 23 Z"
                stroke="white"
                strokeWidth="2.5"
                fill="none"
                strokeLinejoin="round"
              />
              <circle cx="32" cy="32" r="4" fill="white" />
            </svg>
          </div>
        </div>

        {/* Brand */}
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Project<span className="bg-gradient-to-r from-teal-300 to-cyan-400 bg-clip-text text-transparent">Bridge</span>
          </h1>
          <p className="max-w-md text-sm font-light leading-relaxed text-slate-400">
            Turning idle resources into opportunities, and ideas into reality.
          </p>
        </div>

        {/* Progress bar */}
        <div className="relative h-1 w-56 overflow-hidden rounded-full bg-white/10">
          <div
            className="absolute inset-y-0 rounded-full bg-gradient-to-r from-teal-500 via-cyan-300 to-teal-500"
            style={{
              width: '40%',
              animation: 'loadingSlide 1.4s ease-in-out infinite',
            }}
          />
        </div>

        <p className="text-xs font-medium tracking-wide text-teal-400/80">{message}</p>
      </div>

      <style>{`
        @keyframes loadingSlide {
          0% { left: -40%; }
          100% { left: 100%; }
        }
        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spinReverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
      `}</style>
    </div>
  );
}
