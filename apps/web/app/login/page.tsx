'use client'
import { SignInButton, SignUpButton, useAuth } from '@clerk/nextjs';

export default function LoginPage() {
    const { isSignedIn, getToken } = useAuth();

    console.log(isSignedIn, "isSignedIn", getToken)
    
   
  if (isSignedIn) {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    } 
    return null; 
  } 
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-2xl font-bold">Welcome</h1>
        <p>Please sign in or sign up to continue</p>
        <div className="flex gap-4">
            <SignInButton />
            <SignUpButton > 
                <button className="bg-[#6c47ff] text-white rounded-full font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 cursor-pointer">
                  Sign Up
                </button>
            </SignUpButton>
        </div>
    </div>
  );
}
