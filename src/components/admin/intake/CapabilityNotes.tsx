import type { Capabilities } from "@/lib/intake";

/** Plain statement of what this server can and can't do with uploaded documents. */
export function CapabilityNotes({ caps }: { caps: Capabilities }) {
  return (
    <ul className="card space-y-1 text-sm text-brand-700" aria-label="What this server can do">
      <li>
        Accepted: PDF (up to {caps.max_pdf_pages} pages), CSV, Excel .xlsx, and JPEG/PNG/WebP photos; up to {caps.max_file_mb} MB
        each, {caps.max_files_per_batch} files per import.
      </li>
      <li>
        Scanned pages:{" "}
        {caps.ocr_available ? "read with OCR (text recognition). OCR can misread characters, so check what it found." : "OCR is not installed on this server, so scanned pages are reported as unreadable."}
      </li>
      <li>
        AI-assisted extraction:{" "}
        {caps.ai_enabled
          ? "on. Page text is sent to the AI provider; only values found word for word in the document are kept."
          : "off. Products are found from tables, spreadsheets and labelled text (for example “Brand: …”)."}
      </li>
      <li>Virus scanning: {caps.antivirus === "clamav" ? "on (ClamAV)" : "not configured. Files are checked for type, size, scripts and macros only."}</li>
      <li>Nothing is published from an import: every product still goes through review and approval.</li>
    </ul>
  );
}
