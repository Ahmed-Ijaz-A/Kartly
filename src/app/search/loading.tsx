import { ProductGridSkeleton } from "@/components/skeletons";

export default function SearchLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-64 animate-pulse rounded bg-ink-100" />
      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <div className="hidden h-96 animate-pulse rounded-card bg-ink-100 lg:block" />
        <ProductGridSkeleton count={12} />
      </div>
    </div>
  );
}
