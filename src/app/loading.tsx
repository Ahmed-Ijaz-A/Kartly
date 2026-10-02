import { RailSkeleton } from "@/components/skeletons";

export default function HomeLoading() {
  return (
    <div className="space-y-12">
      <div className="h-64 animate-pulse rounded-card bg-ink-100" />
      <RailSkeleton />
      <RailSkeleton />
    </div>
  );
}
