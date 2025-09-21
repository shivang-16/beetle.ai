// import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
// import { NextResponse } from "next/server";

// const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)", "/"]);

export default function middleware(req: Request) {
  // if (!isPublicRoute(req)) {
  //   await auth.protect();
  // }

  // const { isAuthenticated } = await auth();

  // if (isAuthenticated && isPublicRoute(req)) {
  //   return Response.redirect(new URL("/dashboard", req.url));
  // }
};

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};

