"use client";
import { SignedIn, UserButton } from "@clerk/nextjs";

// Note: In the App Router, ClerkProvider must wrap the entire React tree once.
// We already provide it for the Pages Router via pages/_app.tsx.
// For App Router children we assume ClerkProvider is present at the root (Next 15 mixes routers during migration).

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="fixed top-3 right-3 z-50">
        <SignedIn>
          <UserButton afterSignOutUrl="/" appearance={{ variables: { borderRadius: "8px" } }} />
        </SignedIn>
      </header>
      <div className="min-h-screen">{children}</div>
    </>
  );
}
