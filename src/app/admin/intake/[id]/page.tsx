"use client";

import { useParams } from "next/navigation";
import { CatalogueNav } from "@/components/admin/catalogue/shared";
import { IntakeWorkspace } from "@/components/admin/intake/IntakeWorkspace";
import { RequireAuth } from "@/components/RequireAuth";
import { adminCatalogApi } from "@/lib/adminCatalog";
import { intakeApi } from "@/lib/intake";

function AdminIntakeWorkspace() {
  const { id } = useParams<{ id: string }>();
  return (
    <IntakeWorkspace
      batchId={id}
      api={intakeApi}
      nav={<CatalogueNav />}
      listHref="/admin/intake"
      listLabel="Imports"
      productHref={(identityId) => `/admin/catalogue/${identityId}?tab=review`}
      loadCategories={adminCatalogApi.categories}
    />
  );
}

export default function IntakeWorkspacePage() {
  return (
    <RequireAuth adminOnly>
      <AdminIntakeWorkspace />
    </RequireAuth>
  );
}
