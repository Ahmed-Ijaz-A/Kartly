import { CardSkeleton, HeadingSkeleton } from "@/components/skeletons";

export default function PaymentLoading() {
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <HeadingSkeleton width="w-40" />
      <CardSkeleton lines={5} />
    </div>
  );
}
