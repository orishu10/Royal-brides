/** The signature "arch window": white arch with a thin rose arch inside. */
export function ArchCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`arch card w-full max-w-sm p-2.5 ${className}`}>
      <div className="arch border border-rose px-6 pt-12 pb-7 text-center">{children}</div>
    </div>
  );
}
