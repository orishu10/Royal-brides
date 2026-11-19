import type { Metadata } from "next";
import Image from "next/image";
import { OrderSummary } from "@/components/order-summary";
import { requireBride } from "@/lib/bride-auth";
import { formatDate, formatDateTime, todayInIsrael } from "@/lib/format";
import { getOrderForBride, listActiveProducts } from "@/lib/orders";
import { logout } from "./actions";
import { Catalog, type CatalogProduct } from "./catalog";

export const metadata: Metadata = { title: "המוצרים שלי | כלות מלכות" };

export default async function ShopPage() {
  const bride = await requireBride();
  const canShop =
    bride.status === "approved" &&
    !bride.archivedAt &&
    bride.budgetAgorot != null &&
    !!bride.budgetExpiresOn &&
    bride.budgetExpiresOn >= todayInIsrael();

  let content: React.ReactNode;
  if (canShop) {
    const products: CatalogProduct[] = (await listActiveProducts()).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      category: p.category,
      priceAgorot: p.priceAgorot,
      sizes: p.sizes,
      colors: p.colors,
      imageUrl: p.imageKey ? `/product-images/${p.id}?v=${encodeURIComponent(p.imageKey)}` : null,
    }));
    content = (
      <Catalog
        brideId={bride.id}
        products={products}
        budgetAgorot={bride.budgetAgorot!}
        expiresOn={formatDate(bride.budgetExpiresOn!)}
      />
    );
  } else if (bride.status === "ordered" || bride.status === "pickup_scheduled") {
    const order = await getOrderForBride(bride.id);
    content = (
      <section className="card mx-auto max-w-xl rounded-t-[120px] px-6 pt-12 pb-6">
        <h1 className="mb-5 text-center font-display text-3xl">ההזמנה שלך</h1>
        {bride.status === "pickup_scheduled" && bride.pickupAt ? (
          <div className="mb-5 rounded-2xl bg-sage p-4 text-sage-ink">
            <p className="font-bold">מועד האיסוף: {formatDateTime(bride.pickupAt)}</p>
            {bride.pickupAddress && <p>כתובת: {bride.pickupAddress}</p>}
            <p className="mt-1 text-sm">נא לתאם הגעה יום לפני המועד.</p>
          </div>
        ) : (
          <p className="mb-5 rounded-2xl bg-petal p-4">ההזמנה התקבלה. נעדכן אותך במייל על מועד ומקום האיסוף.</p>
        )}
        {order && <OrderSummary order={order} />}
      </section>
    );
  } else {
    const message =
      bride.archivedAt
        ? "התיק שלך סגור."
        : bride.status === "submitted"
          ? "הבקשה שלך בבדיקה. נעדכן אותך במייל ברגע שתתקבל החלטה."
          : bride.status === "rejected"
            ? "לצערנו הבקשה לא אושרה. לפרטים ניתן להשיב למייל שקיבלת."
            : "תוקף הזכאות להזמנה הסתיים. לבירורים ניתן לפנות אלינו במייל.";
    content = <p className="card mx-auto max-w-md rounded-t-[120px] px-8 pt-14 pb-8 text-center text-lg">{message}</p>;
  }

  return (
    <div className="min-h-dvh">
      <header className="mx-auto max-w-6xl px-4 pt-5">
        <div className="card flex items-center gap-3 px-5 py-3">
          <Image src="/brand/logo-rb.png" alt="כלות מלכות" width={670} height={552} className="h-9 w-auto" />
          <span className="font-display text-xl">שלום {bride.firstName}</span>
          <form action={logout} className="ms-auto">
            <button className="min-h-11 px-2 text-sm text-rose-dark hover:underline">יציאה</button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{content}</main>
    </div>
  );
}
