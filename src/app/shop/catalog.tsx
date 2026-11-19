"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { CATEGORIES, MAX_QUANTITY_PER_LINE } from "@/lib/catalog";
import { formatShekels } from "@/lib/format";
import { Pearls } from "@/components/pearls";
import { submitOrder } from "./actions";

export type CatalogProduct = {
  id: string;
  name: string;
  description: string;
  category: string;
  priceAgorot: number;
  sizes: string[];
  colors: string[];
  imageUrl: string | null;
};

type Line = { productId: string; size: string | null; color: string | null; quantity: number };
const lineKey = (l: Omit<Line, "quantity">) => `${l.productId}|${l.size ?? ""}|${l.color ?? ""}`;

export function Catalog(props: { brideId: string; products: CatalogProduct[]; budgetAgorot: number; expiresOn: string }) {
  const { products, budgetAgorot } = props;
  const storageKey = `rb-cart-${props.brideId}`;
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const [cart, setCart] = useState<Line[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [sending, startSending] = useTransition();
  const router = useRouter();

  // Keep the cart in the browser, so a refresh doesn't lose it.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "[]") as Line[];
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time load from browser storage
      setCart(saved.filter((l) => byId.has(l.productId)));
    } catch {}
    setLoaded(true);
  }, [storageKey, byId]);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(cart));
    } catch {}
  }, [cart, loaded, storageKey]);

  const total = cart.reduce((s, l) => s + (byId.get(l.productId)?.priceAgorot ?? 0) * l.quantity, 0);
  const remaining = budgetAgorot - total;
  const itemCount = cart.reduce((s, l) => s + l.quantity, 0);
  const visible = category ? products.filter((p) => p.category === category) : products;
  const usedCategories = CATEGORIES.filter((c) => products.some((p) => p.category === c));

  function add(line: Omit<Line, "quantity">) {
    setError(null);
    setCart((c) => {
      const k = lineKey(line);
      const existing = c.find((l) => lineKey(l) === k);
      if (existing) return c.map((l) => (l === existing ? { ...l, quantity: Math.min(l.quantity + 1, MAX_QUANTITY_PER_LINE) } : l));
      return [...c, { ...line, quantity: 1 }];
    });
  }
  function setQuantity(k: string, quantity: number) {
    setCart((c) => (quantity <= 0 ? c.filter((l) => lineKey(l) !== k) : c.map((l) => (lineKey(l) === k ? { ...l, quantity } : l))));
  }
  function send() {
    if (!confirm("לשלוח את ההזמנה? לאחר השליחה לא ניתן לשנות אותה.")) return;
    setError(null);
    startSending(async () => {
      const res = await submitOrder(cart);
      if (res.ok) {
        setCart([]);
        setCartOpen(false);
        setDone(true);
      } else setError(res.error);
    });
  }

  return (
    <>
      <section className="mb-6 flex flex-col-reverse items-stretch gap-5 sm:flex-row sm:items-end">
        <div className="flex-1">
          <h1 className="font-display text-4xl">הבחירות שלך</h1>
          {usedCategories.length > 1 && (
            <nav className="mt-4 flex flex-wrap gap-2" aria-label="קטגוריות">
              {[null, ...usedCategories].map((c) => (
                <button
                  key={c ?? "all"}
                  onClick={() => setCategory(c)}
                  aria-pressed={category === c}
                  className={`min-h-11 rounded-full px-5 text-sm font-semibold transition ${category === c ? "bg-ink text-white" : "bg-white hover:bg-petal"}`}
                >
                  {c ?? "כל המוצרים"}
                </button>
              ))}
            </nav>
          )}
        </div>
        {/* Budget – an arch */}
        <div className="card rounded-t-[90px] rounded-b-3xl px-6 pt-6 pb-4 text-center sm:w-80">
          <div className="text-sm text-muted">נותר לך לבחירה</div>
          <div className={`font-display text-4xl leading-tight ${remaining < 0 ? "text-red-700" : "text-rose"}`}>{formatShekels(remaining)}</div>
          <div className="text-sm text-muted">
            מתוך {formatShekels(budgetAgorot)} · עד {props.expiresOn}
          </div>
          <button onClick={() => setCartOpen(true)} className="btn-primary mt-3 w-full">
            <CartIcon /> הסל שלי ({itemCount}) · {formatShekels(total)}
          </button>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((p) => (
          <ProductCard key={p.id} product={p} remaining={remaining} onAdd={add} />
        ))}
      </div>

      {cartOpen && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={() => setCartOpen(false)}>
          <aside
            className="flex h-full w-full max-w-md flex-col bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="הסל שלי"
          >
            <div className="flex items-center justify-between border-b border-petal p-4">
              <h2 className="font-display text-2xl">הסל שלי</h2>
              <button onClick={() => setCartOpen(false)} aria-label="סגירה" className="text-2xl leading-none">
                ×
              </button>
            </div>
            <ul className="flex-1 divide-y divide-petal/70 overflow-y-auto px-4">
              {cart.map((l) => {
                const p = byId.get(l.productId)!;
                const k = lineKey(l);
                return (
                  <li key={k} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{p.name}</div>
                      <div className="text-xs text-muted">
                        {[l.size && `מידה ${l.size}`, l.color && `צבע ${l.color}`].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setQuantity(k, l.quantity - 1)} className="h-8 w-8 rounded border border-petal" aria-label="הפחתה">
                        −
                      </button>
                      <span className="w-6 text-center tabular-nums">{l.quantity}</span>
                      <button
                        onClick={() => setQuantity(k, Math.min(l.quantity + 1, MAX_QUANTITY_PER_LINE))}
                        disabled={p.priceAgorot > remaining}
                        className="h-8 w-8 rounded border border-petal disabled:opacity-40"
                        aria-label="הוספה"
                      >
                        +
                      </button>
                    </div>
                    <div className="w-20 text-left tabular-nums">{formatShekels(p.priceAgorot * l.quantity)}</div>
                  </li>
                );
              })}
              {cart.length === 0 && <li className="py-10 text-center text-muted">הסל ריק</li>}
            </ul>
            <div className="space-y-3 border-t border-petal p-4">
              <div className="flex justify-between font-bold">
                <span>סה&quot;כ</span>
                <span>{formatShekels(total)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted">
                <span>נותר מהסכום שהוקצב</span>
                <span className={remaining < 0 ? "text-red-700" : ""}>{formatShekels(remaining)}</span>
              </div>
              {error && (
                <p className="text-sm text-red-700" role="alert">
                  {error}
                </p>
              )}
              <button onClick={send} disabled={sending || cart.length === 0 || remaining < 0} className="btn-primary w-full text-lg">
                {sending ? "שולחת..." : "שליחת הזמנה"}
              </button>
            </div>
          </aside>
        </div>
      )}

      {done && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" role="dialog" aria-modal="true">
          <div className="arch w-full max-w-sm bg-white p-2.5 shadow-xl">
            <div className="arch border border-rose px-6 pt-12 pb-7 text-center">
            <Pearls />
            <h2 className="mt-4 font-display text-3xl">תודה שרכשת!</h2>
            <p className="mt-3 leading-relaxed text-muted">
              ההזמנה התקבלה ונשלח אלייך מייל עם הפרטים.
              <br />
              נעדכן אותך במייל על מועד ומקום האיסוף.
            </p>
            <button onClick={() => router.refresh()} className="btn-primary mt-6 w-full">
              לצפייה בהזמנה
            </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ProductCard({
  product: p,
  remaining,
  onAdd,
}: {
  product: CatalogProduct;
  remaining: number;
  onAdd: (l: Omit<Line, "quantity">) => void;
}) {
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [added, setAdded] = useState(false);
  const missing = (p.sizes.length > 0 && !size) || (p.colors.length > 0 && !color);
  const tooExpensive = p.priceAgorot > remaining;

  return (
    <div className="card flex flex-col rounded-t-[160px] rounded-b-3xl p-2 pb-3">
      <div className="arch-frame flex items-center justify-center overflow-hidden border border-line bg-petal">
        {p.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- served by our own route, already sized
          <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <Pearls />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 px-1.5 pt-3">
        <span className="self-start rounded-full bg-sage px-2.5 py-0.5 text-xs text-sage-ink">{p.category}</span>
        <div className="font-display text-xl leading-tight">{p.name}</div>
        {p.description && <p className="text-xs text-muted">{p.description}</p>}
        <div className="text-lg font-bold">{formatShekels(p.priceAgorot)}</div>
        {p.sizes.length > 0 && (
          <select value={size} onChange={(e) => setSize(e.target.value)} className="field py-1.5 text-sm" aria-label="מידה">
            <option value="">מידה...</option>
            {p.sizes.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        )}
        {p.colors.length > 0 && (
          <select value={color} onChange={(e) => setColor(e.target.value)} className="field py-1.5 text-sm" aria-label="צבע">
            <option value="">צבע...</option>
            {p.colors.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        )}
        <button
          onClick={() => {
            onAdd({ productId: p.id, size: size || null, color: color || null });
            setAdded(true);
            setTimeout(() => setAdded(false), 1200);
          }}
          disabled={missing || tooExpensive}
          className="btn-soft mt-auto py-2 text-sm"
        >
          {added ? "✓ נוסף לסל" : tooExpensive ? "חורג מהסכום" : missing ? "בחרי אפשרות" : "הוספה לסל"}
        </button>
      </div>
    </div>
  );
}

function CartIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18">
      <path d="M3 6 H15 L14 16 H4 Z M6 6 V4 a3 3 0 0 1 6 0 V6" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
