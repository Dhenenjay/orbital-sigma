"use client";
import { ClerkProvider, SignedIn, UserButton } from "@clerk/nextjs";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <header className="fixed top-3 right-3 z-50">
        <SignedIn>
          <UserButton afterSignOutUrl="/" appearance={{ variables: { borderRadius: "8px" } }} />
        </SignedIn>
      </header>
      <div className="min-h-screen">{children}</div>
    </ClerkProvider>
  );
}
