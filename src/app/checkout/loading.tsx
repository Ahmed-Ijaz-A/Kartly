import { CardSkeleton, HeadingSkeleton } from "@/components/skeletons";

export default function CheckoutLoading() {
  return (
    <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <section className="space-y-4">
        <HeadingSkeleton width="w-56" />
        <CardSkeleton lines={6} />
      </section>
      <CardSkeleton lines={5} />
    </div>
  );
}
