import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="bg-foreground flex w-full min-h-screen items-center justify-center p-6 md:p-10">
      <SignIn />
    </div>
  );
}
