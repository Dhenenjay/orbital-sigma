import { NextResponse } from "next/server";
import { withAuth } from "@clerk/nextjs/server";

// Protect /dashboard for signed-in users; keep "/" and auth pages public.
export default withAuth(
  (req) => {
    const { userId } = req.auth;
    const url = req.nextUrl;

    if (!userId && url.pathname.startsWith("/dashboard")) {
      const signInUrl = new URL("/sign-in", url.origin);
      signInUrl.searchParams.set("redirect_url", url.pathname);
      return NextResponse.redirect(signInUrl);
    }

    return NextResponse.next();
  },
  {
    publicRoutes: ["/", "/sign-in(.*)", "/sign-up(.*)"],
  }
);

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|css|js|ico)).*)",
  ],
};

