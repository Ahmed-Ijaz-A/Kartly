import { CardSkeleton, HeadingSkeleton, ItemListSkeleton } from "@/components/skeletons";

export default function CartLoading() {
  return (
    <div className="space-y-6">
      <HeadingSkeleton width="w-40" />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <ItemListSkeleton rows={3} />
        <CardSkeleton lines={5} />
      </div>
    </div>
  );
}
