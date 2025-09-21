import { NextRequest, NextResponse } from 'next/server'

const protectedRoutes = [
  '/dashboard',
  '/analysis',
  '/agents',
]

const isProtectedRoute = (pathname: string) => {
  return protectedRoutes.some(route => pathname.startsWith(route))
}

async function checkUserAuthentication(request: NextRequest) {
  try {
    // Get the auth token from cookies or headers
    const authToken = request.cookies.get('auth-token')?.value || 
                     request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!authToken) {
      return null
    }

    // Make API call to verify user
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL
    if (!apiBaseUrl) {
      console.error('API_BASE_URL not configured')
      return null
    }

    const response = await fetch(`${apiBaseUrl}/api/user`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      return null
    }

    const userData = await response.json()
    return userData.user
  } catch (error) {
    console.error('Error checking user authentication:', error)
    return null
  }
}

export default async function middleware(request: NextRequest) {
  
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}