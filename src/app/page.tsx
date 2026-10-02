import Image from "next/image";
import { desc } from "drizzle-orm";

import { formatCents, discountPercent } from "@/lib/money";

export const dynamic = "force-dynamic";

type HomeData = {
  categoryCount: number;
  productCount: number;
  products: {
    id: number;
    title: string;
    brand: string;
    priceCents: number;
    listPriceCents: number | null;
    rating: number;
    reviewCount: number;
    imageUrl: string;
  }[];
};

/**
 * Step 1 verification page: proves the Next.js app can reach Neon through
 * Drizzle and render real rows.
 *
 * The database module throws on import when DATABASE_URL is missing, so this
 * is imported dynamically and the failure is rendered as setup instructions
 * rather than a stack trace.
 */
async function loadHomeData(): Promise<
  { ok: true; data: HomeData } | { ok: false; message: string }
> {
  try {
    const { db, schema } = await import("@/db");

    const [products, allCategories] = await Promise.all([
      db
        .select({
          id: schema.products.id,
          title: schema.products.title,
          brand: schema.products.brand,
          priceCents: schema.products.priceCents,
          listPriceCents: schema.products.listPriceCents,
          rating: schema.products.rating,
          reviewCount: schema.products.reviewCount,
          imageUrl: schema.products.imageUrl,
        })
        .from(schema.products)
        .orderBy(desc(schema.products.rating))
        .limit(12),
      db.select({ id: schema.categories.id }).from(schema.categories),
    ]);

    const counted = await db.$count(schema.products);

    return {
      ok: true,
      data: {
        categoryCount: allCategories.length,
        productCount: counted,
        products,
      },
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Unknown database error",
    };
  }
}

export default async function HomePage() {
  const result = await loadHomeData();

  if (!result.ok) {
    return (
      <section className="rounded-card border border-amber-accent bg-surface p-6">
        <h1 className="text-xl font-semibold">Database not connected yet</h1>
        <p className="mt-2 text-sm text-ink-700">
          The app is running, but it could not read from Postgres. Finish the
          setup steps in the README:
        </p>
        <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-ink-700">
          <li>
            Copy <code>.env.example</code> to <code>.env.local</code> and set{" "}
            <code>DATABASE_URL</code> to your Neon connection string.
          </li>
          <li>
            Run <code>npm run db:migrate</code> to create the tables.
          </li>
          <li>
            Run <code>npm run db:seed</code> to load the catalogue.
          </li>
        </ol>
        <p className="mt-4 rounded bg-surface-muted p-3 font-mono text-xs text-ink-800">
          {result.message}
        </p>
      </section>
    );
  }

  const { categoryCount, productCount, products } = result.data;

  return (
    <div className="space-y-8">
      <section className="rounded-card bg-ink-800 px-6 py-8 text-ink-50">
        <h1 className="text-3xl font-bold tracking-tight">Everyday things, chosen well</h1>
        <p className="mt-2 max-w-2xl text-ink-200">
          Kartly is a general merchandise store. Browse, search, and check out —
          the whole loop, built in 24 hours.
        </p>
        <p className="mt-4 text-sm text-ink-300">
          Connected to Postgres: <strong className="text-amber-accent">{productCount}</strong>{" "}
          products across <strong className="text-amber-accent">{categoryCount}</strong>{" "}
          categories.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Top rated right now</h2>

        {products.length === 0 ? (
          <p className="rounded-card bg-surface p-6 text-sm text-ink-700">
            No products yet. Run <code>npm run db:seed</code> to load the catalogue.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => {
              const percentOff = product.listPriceCents
                ? discountPercent(product.priceCents, product.listPriceCents)
                : 0;

              return (
                <li
                  key={product.id}
                  className="flex flex-col overflow-hidden rounded-card bg-surface shadow-sm"
                >
                  <div className="relative aspect-square bg-surface-muted">
                    <Image
                      src={product.imageUrl}
                      alt={product.title}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-1 p-3">
                    <p className="text-xs text-ink-500">{product.brand}</p>
                    <p className="line-clamp-2 text-sm font-medium">{product.title}</p>
                    <p className="text-xs text-ink-700">
                      {/* Locale pinned, as in lib/money.ts: an unpinned
                          toLocaleString would format differently on the server
                          and in the visitor's browser once this card becomes a
                          Client Component. */}
                      {product.rating.toFixed(1)} ★ (
                      {product.reviewCount.toLocaleString("en-US")})
                    </p>
                    <p className="mt-auto pt-2">
                      <span className="text-base font-semibold">
                        {formatCents(product.priceCents)}
                      </span>
                      {percentOff > 0 && product.listPriceCents ? (
                        <>
                          {" "}
                          <span className="text-xs text-ink-500 line-through">
                            {formatCents(product.listPriceCents)}
                          </span>{" "}
                          <span className="text-xs font-medium text-amber-accent-dark">
                            −{percentOff}%
                          </span>
                        </>
                      ) : null}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
