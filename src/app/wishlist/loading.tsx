import { HeadingSkeleton, ItemListSkeleton } from "@/components/skeletons";

export default function WishlistLoading() {
  return (
    <div className="space-y-6">
      <HeadingSkeleton width="w-40" />
      <ItemListSkeleton rows={3} />
    </div>
  );
}
