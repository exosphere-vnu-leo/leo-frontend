export default function Card({ children, className = "" }) {
  return (
    <div
      className={`rounded-xl border border-slate-700/70 bg-slate-950/70 shadow-lg shadow-cyan-950/20 ${className}`}
    >
      {children}
    </div>
  );
}