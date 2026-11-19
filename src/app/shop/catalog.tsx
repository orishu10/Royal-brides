"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { CATEGORIES, MAX_QUANTITY_PER_LINE } from "@/lib/catalog";
import { formatShekels } from "@/lib/format";
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
      {/* Budget bar */}
      <div className="sticky top-0 z-20 -mx-4 mb-5 border-b border-sand bg-cream/95 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div>
            <span className="text-sm text-muted">נותר לך: </span>
            <b className={`text-lg ${remaining < 0 ? "text-red-700" : "text-gold-dark"}`}>{formatShekels(remaining)}</b>
            <span className="text-sm text-muted"> מתוך {formatShekels(budgetAgorot)} · עד {props.expiresOn}</span>
          </div>
          <button onClick={() => setCartOpen(true)} className="btn-gold ms-auto py-2">
            🛍 הסל שלי ({itemCount}) · {formatShekels(total)}
          </button>
        </div>
      </div>

      {usedCategories.length > 1 && (
        <nav className="mb-5 flex flex-wrap gap-2">
          {[null, ...usedCategories].map((c) => (
            <button
              key={c ?? "all"}
              onClick={() => setCategory(c)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold ${category === c ? "bg-gold text-white" : "bg-white hover:bg-sand"}`}
            >
              {c ?? "כל המוצרים"}
            </button>
          ))}
        </nav>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
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
            <div className="flex items-center justify-between border-b border-sand p-4">
              <h2 className="text-lg font-bold">הסל שלי</h2>
              <button onClick={() => setCartOpen(false)} aria-label="סגירה" className="text-2xl leading-none">
                ×
              </button>
            </div>
            <ul className="flex-1 divide-y divide-sand/70 overflow-y-auto px-4">
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
                      <button onClick={() => setQuantity(k, l.quantity - 1)} className="h-8 w-8 rounded border border-sand" aria-label="הפחתה">
                        −
                      </button>
                      <span className="w-6 text-center tabular-nums">{l.quantity}</span>
                      <button
                        onClick={() => setQuantity(k, Math.min(l.quantity + 1, MAX_QUANTITY_PER_LINE))}
                        disabled={p.priceAgorot > remaining}
                        className="h-8 w-8 rounded border border-sand disabled:opacity-40"
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
            <div className="space-y-3 border-t border-sand p-4">
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
              <button onClick={send} disabled={sending || cart.length === 0 || remaining < 0} className="btn-gold w-full text-lg">
                {sending ? "שולחת..." : "שליחת הזמנה"}
              </button>
            </div>
          </aside>
        </div>
      )}

      {done && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
            <div className="text-4xl text-gold" aria-hidden>
              ♛
            </div>
            <h2 className="mt-3 text-2xl font-bold">תודה שרכשת!</h2>
            <p className="mt-3 leading-relaxed">
              ההזמנה התקבלה ונשלח אלייך מייל עם הפרטים.
              <br />
              נעדכן אותך במייל על מועד ומקום האיסוף.
            </p>
            <button onClick={() => router.refresh()} className="btn-gold mt-6 w-full">
              לצפייה בהזמנה
            </button>
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
    <div className="flex flex-col overflow-hidden rounded-xl bg-white shadow-sm">
      <div className="flex aspect-square items-center justify-center bg-sand/40">
        {p.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- served by our own route, already sized
          <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <span className="text-4xl text-gold/50" aria-hidden>
            ♛
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="font-semibold leading-tight">{p.name}</div>
        {p.description && <p className="text-xs text-muted">{p.description}</p>}
        <div className="font-bold text-gold-dark">{formatShekels(p.priceAgorot)}</div>
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
          className="btn-outline mt-auto py-2 text-sm"
        >
          {added ? "✓ נוסף לסל" : tooExpensive ? "חורג מהסכום" : missing ? "בחרי אפשרות" : "הוספה לסל"}
        </button>
      </div>
    </div>
  );
}
