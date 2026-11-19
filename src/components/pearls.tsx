/** Decorative row of pearls (graduated dots). */
export function Pearls({ className = "" }: { className?: string }) {
  const sizes = [6, 8, 10, 8, 6];
  return (
    <div className={`flex items-center justify-center gap-[7px] ${className}`} aria-hidden="true">
      {sizes.map((s, i) => (
        <span
          key={i}
          className={`rounded-full ${i === 2 ? "bg-rose" : i % 2 ? "bg-[#e2c2c5]" : "bg-[#ead3d4]"}`}
          style={{ width: s, height: s }}
        />
      ))}
    </div>
  );
}
