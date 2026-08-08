import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
};

export function BrandMark({ className }: BrandMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("relative inline-grid shrink-0 place-items-center", className)}
    >
      <img
        src="/brand/mark-dark.png"
        alt=""
        draggable={false}
        className="h-full w-full object-contain dark:hidden"
      />
      <img
        src="/brand/mark-light.png"
        alt=""
        draggable={false}
        className="hidden h-full w-full object-contain dark:block"
      />
    </span>
  );
}
