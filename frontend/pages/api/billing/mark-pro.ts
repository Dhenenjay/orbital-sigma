import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth, clerkClient } from "@clerk/nextjs/server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    await clerkClient.users.updateUser(userId, {
      publicMetadata: { plan: "pro" },
    });
    return res.status(200).json({ ok: true });
  } catch (e) {
    const error = e instanceof Error ? e.message : "Failed to mark user as Pro";
    return res.status(500).json({ error });
  }
}
