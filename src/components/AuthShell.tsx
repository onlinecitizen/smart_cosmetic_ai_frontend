import { Bottle } from "./Bottle";

export { safeNextPath } from "@/lib/safeNext";

export function AuthShell({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-12 sm:px-6 md:grid-cols-2 md:py-20">
      <div className="relative hidden h-[520px] md:block">
        <Bottle className="mx-auto h-full w-[300px]" />
      </div>
      <div className="mx-auto w-full max-w-md">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="display mt-4 text-5xl">{title}</h1>
        <div className="mt-10">{children}</div>
      </div>
    </div>
  );
}
