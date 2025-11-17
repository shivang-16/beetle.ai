import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)", "/", '/_betterstack/(.*)']);
const isEarlyAccessRoute = createRouteMatcher(["/early-access(.*)"]);

// Helper function to fetch user data in middleware
const fetchUserData = async (token: string) => {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    return data.user;
  } catch (error) {
    console.error('Error fetching user data in middleware:', error);
    return null;
  }
};

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  const { isAuthenticated, sessionClaims, getToken } = await auth();

  // Early access control for authenticated users
  if (isAuthenticated) {
    const token = await getToken();
    if (token) {
      const user = await fetchUserData(token);
      
      if (user) {
        const pathname = req.nextUrl.pathname;
        
        // If user has early access, redirect them away from /early-access route
        if (user.earlyAccess && isEarlyAccessRoute(req)) {
          const activeOrgSlug = (sessionClaims as any)?.o?.slg as string | undefined;
          
          if (activeOrgSlug) {
            return NextResponse.redirect(new URL(`/${activeOrgSlug}/dashboard`, req.url));
          } else {
            return NextResponse.redirect(new URL("/dashboard", req.url));
          }
        }
        
        // If user doesn't have early access, only allow / and /early-access routes
        if (!user.earlyAccess) {
          // Allow home route (/), early access route, and sign-in/sign-up routes
          const isAllowedRoute = pathname === "/" || isEarlyAccessRoute(req) || pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");
          
          if (!isAllowedRoute) {
            return NextResponse.redirect(new URL("/early-access", req.url));
          }
          
          // If user is on home route and doesn't have early access, allow them to stay
          if (pathname === "/") {
            return NextResponse.next();
          }
        }
      }
    }
  }

  if (isAuthenticated && isPublicRoute(req)) {
    const pathname = req.nextUrl.pathname;
    
    // Don't redirect from home route if user doesn't have early access
    if (pathname === "/") {
      const token = await getToken();
      if (token) {
        const user = await fetchUserData(token);
        if (user && !user.earlyAccess) {
          return NextResponse.next();
        }
      }
    }
    
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

    // Define routes that should have team context (include Settings)
    const teamRoutes = ['/dashboard', '/analysis', '/agents', '/pr-analysis', '/settings'];
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