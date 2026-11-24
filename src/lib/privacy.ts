"use client";

import { api } from "@/lib/api";

/** Configured facts for the privacy notice (backend GET /api/v1/privacy/notice-info). */
export interface NoticeInfo {
  notice_version: string;
  contact_email: string | null;
  order_request_retention_days: number;
}

export interface RetentionReport {
  retention_days: number;
  order_requests_to_clear: number;
  old_sessions: number;
  old_reset_tokens: number;
  /** Beauty Assistant conversations (structured needs only) idle past their retention period. */
  idle_assistant_conversations?: number;
}

export const privacyApi = {
  noticeInfo: () => api.get<NoticeInfo>("/api/v1/privacy/notice-info"),
  exportMyData: () => api.get<Record<string, unknown>>("/api/v1/account/export"),
  deleteAccount: (password: string) => api.post<void>("/api/v1/account/delete", { password }),
  setFacialConsent: (granted: boolean) =>
    api.post("/api/v1/diagnostics/consent", { consent_type: "facial_image_processing", granted }),
  retentionPreview: () => api.get<RetentionReport>("/api/v1/admin/privacy/retention"),
  retentionRun: () => api.post<RetentionReport>("/api/v1/admin/privacy/retention/run"),
};

/** Offer a JSON object to the browser as a file download. */
export function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
