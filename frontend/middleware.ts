import { authMiddleware } from "@clerk/nextjs";

// Protect /dashboard for signed-in users; keep public routes open.
export default authMiddleware({
  publicRoutes: ["/", "/sign-in(.*)", "/sign-up(.*)", "/pricing"],
  afterAuth(auth, req) {
    const { userId } = auth;
    const url = new URL(req.nextUrl);
    if (!userId && url.pathname.startsWith("/dashboard")) {
      const signInUrl = new URL("/sign-in", url.origin);
      signInUrl.searchParams.set("redirect_url", url.pathname);
      return Response.redirect(signInUrl);
    }
    return;
  },
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|css|js|ico)).*)",
  ],
};

