"use client";
import { ClerkProvider } from "@clerk/nextjs";
import type { AppProps } from "next/app";
import "../src/app/globals.css";

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ClerkProvider>
      <Component {...pageProps} />
    </ClerkProvider>
  );
}
