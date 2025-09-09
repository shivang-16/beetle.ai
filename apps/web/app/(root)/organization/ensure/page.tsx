import { _config } from "@/lib/_config";
import { getAuthToken } from "@/_actions/auth-token";
import { redirect } from "next/navigation";

export default async function EnsureOrgTeamPage() {
  const { token } = await getAuthToken();
  await fetch(`${_config.API_BASE_URL}/api/team/current`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  redirect("/dashboard");
}


