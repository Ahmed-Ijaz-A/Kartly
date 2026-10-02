import { CardSkeleton, HeadingSkeleton } from "@/components/skeletons";

export default function AccountLoading() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <HeadingSkeleton width="w-44" />
      <CardSkeleton lines={3} />
    </div>
  );
}
