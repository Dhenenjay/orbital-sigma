import { Protect } from "@clerk/nextjs";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <main style={{ padding: 24 }}>
      <h1>Dashboard</h1>
      <p>This page is protected by Clerk middleware. You must be signed in to view it.</p>

      {/* Pro-only area */}
      <Protect has={{ plan: "pro" }}>
        <section style={{ marginTop: 24, padding: 16, border: "1px solid #e5e7eb", borderRadius: 8 }}>
          <h2>Pro features</h2>
          <p>You are on the Pro plan. Unlimited queries are enabled.</p>
        </section>
      </Protect>

      {/* Shown to non-Pro users */}
      <Protect hasNot={{ plan: "pro" }}>
        <section style={{ marginTop: 24, padding: 16, border: "1px dashed #f59e0b", borderRadius: 8, background: "#fffbeb" }}>
          <h2>Upgrade to Pro</h2>
          <p>You are on the Free plan (5 queries/day). Upgrade for unlimited queries.</p>
          <Link href="/pricing" style={{ display: "inline-block", marginTop: 12, padding: "8px 14px", background: "#111827", color: "white", borderRadius: 6 }}>
            View plans
          </Link>
        </section>
      </Protect>
    </main>
  );
}

