export function PageLoader({ message }: { message?: string | null }) {
  return (
    <div className="grid min-h-[50vh] place-items-center px-4 text-center">
      {message ? (
        <p className="text-sm text-brand-500">{message}</p>
      ) : (
        <span className="h-8 w-8 animate-spin rounded-full border border-brand-200 border-t-gold-500" aria-label="Loading" />
      )}
    </div>
  );
}
