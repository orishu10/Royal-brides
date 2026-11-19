import Image from "next/image";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { logout } from "../login/actions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="min-h-dvh bg-cream">
      <header className="border-b border-sand bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link href="/admin" className="flex items-center gap-2">
            <Image src="/brand/logo-rb.png" alt="" width={670} height={552} className="h-9 w-auto" />
            <span className="font-bold text-gold-dark">פורטל מנהלת</span>
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/admin" className="hover:text-gold-dark">
              כלות
            </Link>
            <Link href="/admin/products" className="hover:text-gold-dark">
              מוצרים
            </Link>
          </nav>
          <div className="ms-auto flex items-center gap-3 text-sm">
            <span className="hidden text-muted sm:inline">
              {admin.name}
              {admin.role === "maintainer" && " (תחזוקה)"}
            </span>
            <form action={logout}>
              <button className="text-gold-dark underline-offset-4 hover:underline">יציאה</button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
    </div>
  );
}
