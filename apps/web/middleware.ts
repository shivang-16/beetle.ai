import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)", "/", '/_betterstack/(.*)']);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  const { isAuthenticated, sessionClaims } = await auth();

  if (isAuthenticated && isPublicRoute(req)) {
    // Get the active organization from session claims
    const activeOrgSlug = (sessionClaims as any)?.o?.slg as string | undefined;
    
    if (activeOrgSlug) {
      // Redirect to team dashboard if organization is active
      return NextResponse.redirect(new URL(`/${activeOrgSlug}/dashboard`, req.url));
    } else {
      // Redirect to personal dashboard if no organization
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  // Handle team slug routing for authenticated users
  if (isAuthenticated) {
    const url = req.nextUrl.clone();
    const pathname = url.pathname;
    const activeOrgSlug = (sessionClaims as any)?.o?.slg as string | undefined;

    // Define routes that should have team context
    const teamRoutes = ['/dashboard', '/analysis', '/agents'];
    const isTeamRoute = teamRoutes.some(route => pathname === route || pathname.startsWith(route + '/'));
    
    // Check if we're on a team route without slug but have an active organization
    if (isTeamRoute && activeOrgSlug && !pathname.startsWith(`/${activeOrgSlug}`)) {
      url.pathname = `/${activeOrgSlug}${pathname}`;
      return NextResponse.redirect(url);
    }
    
    // Check if we're on a team route with slug but no active organization
    const pathSegments = pathname.split('/').filter(Boolean);
    if (pathSegments.length > 1 && !activeOrgSlug) {
      const potentialSlug = pathSegments[0];
      const remainingPath = '/' + pathSegments.slice(1).join('/');
      
      // If the first segment looks like a team slug and we have no active org, redirect to personal
      if (teamRoutes.some(route => remainingPath === route || remainingPath.startsWith(route + '/'))) {
        url.pathname = remainingPath;
        return NextResponse.redirect(url);
      }
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|mp4|webm|ogv?|mov|m4v|mp3|wav|ogg)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};