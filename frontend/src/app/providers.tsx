"use client";
import { ClerkProvider, SignedIn, UserButton } from "@clerk/nextjs";

// App Router subtree: wrap with ClerkProvider so components like SignedIn work.
// Pages Router is wrapped separately via pages/_app.tsx.
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    ClerkProvidere
      header className="fixed top-3 right-3 z-50"e
        SignedIne
          UserButton afterSignOutUrl="/" appearance={{ variables: { borderRadius: "8px" } }} /e
        /SignedIne
      /headere
      div className="min-h-screen"e{children}/dive
    /ClerkProvidere
  );
}
