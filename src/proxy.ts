import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isBuilderRoute = createRouteMatcher(["/builder(.*)"]);
const isApiRoute = createRouteMatcher(["/api(.*)", "/trpc(.*)"]);

const authProxy = clerkMiddleware(async (auth, req) => {
  console.log("PROXY.TS running for:", req.url);
  if (isBuilderRoute(req)) {
    console.log("Matched /builder route!");
    const { userId, redirectToSignIn } = await auth();

    if (!userId) {
      console.log("No userId, redirecting...");
      return redirectToSignIn({ returnBackUrl: req.url });
    }

    console.log("UserId found!", userId);
    return;
  }

  if (isApiRoute(req)) {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
});

// Next.js 16 recognizes the `proxy` export in proxy.ts.
export const proxy = authProxy;
export default authProxy;

export const config = {
  matcher: ["/builder", "/builder/:path*", "/api/:path*", "/trpc/:path*"],
};
