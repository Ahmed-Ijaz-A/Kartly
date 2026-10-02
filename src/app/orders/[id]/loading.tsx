import { CardSkeleton, HeadingSkeleton, ItemListSkeleton } from "@/components/skeletons";

export default function OrderDetailLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <HeadingSkeleton width="w-48" />
      <ItemListSkeleton rows={2} />
      <div className="grid gap-6 sm:grid-cols-2">
        <CardSkeleton lines={4} />
        <CardSkeleton lines={4} />
      </div>
    </div>
  );
}
