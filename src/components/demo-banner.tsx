export function DemoBanner() {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 border-b border-accent/20 bg-accent/10 px-4 py-2 text-xs font-medium text-foreground"
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
      </span>
      Preview mode: sample data is loaded for showcase
    </div>
  );
}
