"use client";

import { OrganizationList } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function OrganizationsPage() {
  const router = useRouter();
  return (
    <OrganizationList
      hidePersonal
      afterCreateOrganizationUrl={(org) => {
        // Once org is created, go to ensure-team route to create local team
        return `/organization/ensure?orgId=${org.id}`;
      }}
      afterSelectOrganizationUrl={() => "/dashboard"}
    />
  );
}



