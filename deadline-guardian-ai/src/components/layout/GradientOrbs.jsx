/** Decorative, slowly drifting blue→purple gradient orbs for a premium glass backdrop. */
export default function GradientOrbs({ className = '' }) {
  return (
    <div className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className}`}>
      <div className="animate-drift absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand-400/30 blur-3xl" />
      <div className="animate-drift-slow absolute right-[-6rem] top-24 h-80 w-80 rounded-full bg-violet-400/25 blur-3xl" />
      <div className="animate-floaty absolute bottom-[-8rem] left-1/3 h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl" />
      <div className="animate-glow absolute right-1/4 top-1/2 h-56 w-56 rounded-full bg-fuchsia-300/20 blur-3xl" />
    </div>
  );
}
