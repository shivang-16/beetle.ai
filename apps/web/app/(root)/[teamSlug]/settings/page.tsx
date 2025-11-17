import React from "react";
import SettingsContent from "../../settings/_components/SettingsContent";

interface PageProps {
  params: Promise<{ teamSlug: string }>;
}

const Page = async ({ params }: PageProps) => {
  const resolved = await params;
  return <SettingsContent scope="team" teamSlug={resolved.teamSlug} />;
};

export default Page;