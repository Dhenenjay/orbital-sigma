"use client";
import { PricingTable } from "@clerk/nextjs";

export default function PricingCheckout() {
  return <PricingTable redirectUrl="/dashboard" />;
}

