"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Assessment } from "@/components/studio/Assessment";
import { QUESTION_ORDER, QuestionId } from "@/lib/studio";

function AssessmentWithParams() {
  const edit = useSearchParams().get("edit");
  const editId = edit && (QUESTION_ORDER as string[]).includes(edit) ? (edit as QuestionId) : null;
  return <Assessment editId={editId} />;
}

export default function AssessmentPage() {
  return (
    <Suspense fallback={null}>
      <AssessmentWithParams />
    </Suspense>
  );
}
