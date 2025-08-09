import { clerkMiddleware } from "@clerk/nextjs/server";

// Use Clerk's middleware compatible with your installed version.
export default clerkMiddleware((auth, req) => {
  const { userId } = auth();
  const url = new URL(req.nextUrl);

  // Public routes are allowed
  const isPublic = ["/", "/pricing", "/sign-in", "/sign-up"].some((p) => url.pathname.startsWith(p));
  if (isPublic) return;

  // Protect /dashboard for signed-in users
  if (!userId && url.pathname.startsWith("/dashboard")) {
    const signInUrl = new URL("/sign-in", url.origin);
    signInUrl.searchParams.set("redirect_url", url.pathname);
    return Response.redirect(signInUrl);
  }
  return;
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|css|js|ico)).*)",
  ],
};

