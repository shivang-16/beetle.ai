import { NextRequest, NextResponse } from 'next/server'
import { getUser } from './_actions/user-actions'

const protectedRoutes = [
  '/dashboard',
  '/analysis',
  '/agents',
]

const isProtectedRoute = (pathname: string) => {
  return protectedRoutes.some(route => pathname.startsWith(route))
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Check if the route is protected
  if (isProtectedRoute(pathname)) {
    try {
      const user = await getUser()
      
      // If user is not authenticated, redirect to home
      if (!user) {
        return NextResponse.redirect(new URL('/', request.url))
      }
      
      // User is authenticated, continue to the protected route
      return NextResponse.next()
    } catch (error) {
      // If there's an error getting user (e.g., invalid token), redirect to home
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // For non-protected routes, check if user is authenticated and redirect to dashboard
  try {
    const user = await getUser()
    
    // If user is authenticated and trying to access home page, redirect to dashboard
    if (user && pathname === '/') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  } catch (error) {
    // If there's an error, just continue to the requested route
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}