import { action } from "./_generated/server";
import { v } from "convex/values";

// Action: Sync plan from Clerk and enforce daily usage for free tier
export const enforceUsageWithClerk = action({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const clerkSecret = process.env.CLERK_SECRET_KEY;
    if (!clerkSecret) {
      throw new Error("CLERK_SECRET_KEY is not set in environment");
    }

    // Fetch Clerk user
    const res = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(userId)}` , {
      method: "GET",
      headers: {
        Authorization: `Bearer ${clerkSecret}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Failed to fetch Clerk user: ${res.status} ${res.statusText} ${text}`);
    }

    const user = await res.json();

    // Determine plan from Clerk metadata; prefer public_metadata.plan, fallback to private_metadata.plan
    const planFromClerk: unknown =
      (user?.public_metadata && user.public_metadata.plan) ??
      (user?.private_metadata && user.private_metadata.plan);

    const plan = planFromClerk === "pro" ? "pro" : "free" as "pro" | "free";

    // Upsert users table with basic identity
    const primaryEmail: string | undefined = user?.email_addresses?.find?.((e: any) => e?.id === user?.primary_email_address_id)?.email_address
      ?? user?.email_addresses?.[0]?.email_address
      ?? user?.primary_email_address?.email_address;
    await ctx.runMutation("users:upsertUser", {
      clerkUserId: userId,
      email: primaryEmail ?? "",
      plan,
    });

    // Upsert profile in Convex to reflect latest plan (kept for backward compatibility)
    await ctx.runMutation("billing:upsertProfile", {
      userId,
      plan,
      stripeCustomerId: undefined,
    });

    // If pro, always allowed; otherwise enforce daily limit via existing mutation
    if (plan === "pro") {
      return { allowed: true, plan } as const;
    }

    const result = await ctx.runMutation("billing:checkAndCountUsage", { userId });
    return { ...result, plan } as const;
  },
});

