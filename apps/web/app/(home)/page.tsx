import { auth } from "@clerk/nextjs/server";
import MainWebsite from "./_components/websiteComp/mainWebsite";
import { redirect } from "next/navigation";

export default async function Home() {
  const { isAuthenticated } = await auth();

  if (isAuthenticated) redirect("/dashboard");

  return <MainWebsite />;
}
