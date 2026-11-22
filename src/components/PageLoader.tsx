import { ErrorState, Spinner } from "@/components/ui/States";

/** Full-page loading state, or an error with an optional retry once loading failed. */
export function PageLoader({ message, onRetry }: { message?: string | null; onRetry?: () => void }) {
  return (
    <div className="grid min-h-[50vh] place-items-center px-4">
      {message ? <ErrorState message={message} onRetry={onRetry} className="w-full max-w-md" /> : <Spinner />}
    </div>
  );
}
