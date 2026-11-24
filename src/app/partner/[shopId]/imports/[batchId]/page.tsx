"use client";

import { useParams } from "next/navigation";
import { useMemo } from "react";
import { IntakeWorkspace } from "@/components/admin/intake/IntakeWorkspace";
import { PartnerNav } from "@/components/partner/PartnerNav";
import { RequireAuth } from "@/components/RequireAuth";
import { makeShopApi } from "@/lib/partner";

function PartnerImport() {
  const { shopId, batchId } = useParams<{ shopId: string; batchId: string }>();
  const shopApi = useMemo(() => makeShopApi(shopId), [shopId]);
  const loadCategories = useMemo(() => async () => (await shopApi.formOptions()).categories, [shopApi]);
  return (
    <IntakeWorkspace
      batchId={batchId}
      api={shopApi.intake}
      nav={<PartnerNav shopId={shopId} />}
      listHref={`/partner/${shopId}/imports`}
      listLabel="Imports"
      productHref={(identityId) => `/partner/${shopId}/products/${identityId}`}
      loadCategories={loadCategories}
    />
  );
}

export default function PartnerImportPage() {
  return (
    <RequireAuth>
      <PartnerImport />
    </RequireAuth>
  );
}
