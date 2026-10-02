import { CardSkeleton } from "@/components/skeletons";

export default function ConfirmationLoading() {
  return (
    <div className="mx-auto max-w-xl">
      <CardSkeleton lines={4} />
    </div>
  );
}
