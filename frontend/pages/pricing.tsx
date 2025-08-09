import { PricingTable } from "@clerk/nextjs";

export default function Pricing() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ maxWidth: 960, width: "100%" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>Choose your plan</h1>
        <PricingTable redirectUrl="/dashboard" />
      </div>
    </main>
  );
}
