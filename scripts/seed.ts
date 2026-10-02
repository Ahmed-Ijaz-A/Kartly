/**
 * Kartly catalogue seed.
 *
 * Generates 500 products across 10 categories, plus reviews.
 *
 * Deterministic: a seeded PRNG drives every fallback price, stock level and
 * review selection, so re-running produces the same catalogue rather than a
 * different one. Safe to run repeatedly -- it clears the catalogue tables
 * first.
 *
 * Data source: the Amazon Reviews 2023 dataset (McAuley Lab, UC San Diego),
 * fetched by scripts/fetch-amazon-dataset.ts into
 * scripts/amazon-products.json. Real listings -- title, brand/author,
 * description and a multi-angle photo set per product, all already matched
 * to each other because they come from the same real listing. That's a
 * deliberate trade-off, not an oversight: this uses real brand names and
 * real product photography, where Kartly otherwise uses its own invented
 * brands. See that script's header for the full reasoning and the licensing
 * basis (an academic dataset, free to use for coursework).
 *
 * Reviews stay separately generated (REVIEW_TEMPLATES below) -- synthetic,
 * not from the dataset.
 */
import { config } from "dotenv";

config({ path: ".env.local" });

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "../src/db/schema";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

type AmazonProduct = {
  parentAsin: string;
  title: string;
  brand: string;
  description: string;
  priceCents: number | null;
  rating: number | null;
  reviewCount: number | null;
  imageUrl: string;
  extraImages: string[];
};

const AMAZON_PRODUCTS: Record<string, AmazonProduct[]> = JSON.parse(
  fs.readFileSync(path.join(__dirname, "amazon-products.json"), "utf8"),
);

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and add your Neon connection string.",
  );
  process.exit(1);
}

const db = drizzle(neon(databaseUrl), { schema });

/* ----------------------------------------------------------------- random */

/** Deterministic PRNG (mulberry32) so the catalogue is identical every run. */
function makeRandom(seed: number) {
  let a = seed;
  return function random(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = makeRandom(20261002);

const randomInt = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));

function pickSome<T>(items: readonly T[], count: number): T[] {
  const pool = [...items];
  const out: T[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    out.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  }
  return out;
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(random() * items.length)];
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 150);
}

/* ------------------------------------------------------------ source data */

type CategorySeed = { slug: string; name: string; description: string };

const CATEGORIES: readonly CategorySeed[] = [
  {
    slug: "electronics",
    name: "Electronics",
    description: "Audio, displays, and everyday tech that earns its desk space.",
  },
  {
    slug: "home-kitchen",
    name: "Home & Kitchen",
    description: "Cookware, small appliances and the quiet workhorses of a kitchen.",
  },
  {
    slug: "sports-outdoors",
    name: "Sports & Outdoors",
    description: "Training gear and kit for getting outside.",
  },
  {
    slug: "books",
    name: "Books",
    description: "Fiction, reference and the kind of book you actually finish.",
  },
  {
    slug: "clothing",
    name: "Clothing",
    description: "Everyday wear built to survive the wash.",
  },
  {
    slug: "beauty",
    name: "Beauty",
    description: "Skincare and grooming without the ten-step routine.",
  },
  {
    slug: "toys-games",
    name: "Toys & Games",
    description: "Board games, puzzles and things that survive a six-year-old.",
  },
  {
    slug: "office",
    name: "Office",
    description: "Desk, chair and the small things that make a workday bearable.",
  },
  {
    slug: "pet-supplies",
    name: "Pet Supplies",
    description: "Kit for the other members of the household.",
  },
  {
    slug: "garden",
    name: "Garden",
    description: "Tools and planters for a balcony or an acre.",
  },
] as const;

/**
 * Fallback price band per category, in cents -- used only when the dataset's
 * own `price` was null (roughly half of listings; real prices are used
 * wherever present). Coarser than the old per-item-type ranges since there's
 * no item-type template anymore, but still a sane band per category.
 */
const FALLBACK_PRICE_RANGES: Record<string, readonly [number, number]> = {
  electronics: [1500, 50000],
  "home-kitchen": [1000, 40000],
  "sports-outdoors": [1000, 40000],
  books: [700, 3000],
  clothing: [1000, 20000],
  beauty: [500, 6000],
  "toys-games": [500, 15000],
  office: [500, 30000],
  "pet-supplies": [500, 15000],
  garden: [500, 25000],
};

const REVIEW_AUTHORS = [
  "A. Whitfield", "Marcus L.", "Priya N.", "Dana K.", "Tom R.", "S. Okonkwo",
  "Hannah B.", "Jules P.", "Ravi S.", "Lena M.", "Chris D.", "Noor A.",
  "Sam T.", "Elif K.", "Jonas W.", "Mei L.",
] as const;

const REVIEW_TEMPLATES: readonly { rating: number; title: string; body: string }[] = [
  { rating: 5, title: "Exactly what I wanted", body: "Arrived quickly and does the job properly. I have used it daily for a few weeks now with no complaints at all." },
  { rating: 5, title: "Worth it", body: "I hesitated at the price and I should not have. The build quality is obvious the moment you pick it up." },
  { rating: 4, title: "Very good, one small gripe", body: "Does everything well. The only thing I would change is the packaging, which was more than it needed to be." },
  { rating: 4, title: "Solid choice", body: "Compared three options before settling on this one. No regrets, though it is slightly bulkier than I expected." },
  { rating: 3, title: "Fine for the price", body: "It works. It is not remarkable, but nothing about it is bad either, and it cost less than the alternatives." },
  { rating: 3, title: "Mixed feelings", body: "Half of it is excellent and half is average. Still kept it, but I can see why some reviews are lukewarm." },
  { rating: 2, title: "Not for me", body: "The quality is acceptable but it did not fit how I actually work. That is partly my fault for not reading the dimensions." },
  { rating: 5, title: "Bought a second one", body: "Liked the first one enough that I ordered another for my partner. That is the strongest recommendation I can give." },
  { rating: 4, title: "Good everyday option", body: "Nothing flashy, just reliable. It has handled regular use better than the more expensive one it replaced." },
  { rating: 1, title: "Disappointed", body: "Mine had a defect out of the box. Support sorted it, but I would rather it had been right the first time." },
];

/* ---------------------------------------------------------------- builder */

type ProductInsert = typeof schema.products.$inferInsert;

function buildProducts(categoryId: number, category: CategorySeed): ProductInsert[] {
  const source = AMAZON_PRODUCTS[category.slug];
  if (!source || source.length === 0) {
    throw new Error(
      `No Amazon-sourced products for "${category.slug}". Run: npx tsx scripts/fetch-amazon-dataset.ts`,
    );
  }

  const [fallbackLow, fallbackHigh] = FALLBACK_PRICE_RANGES[category.slug];
  const rows: ProductInsert[] = [];
  const usedSlugs = new Set<string>();

  for (const item of source) {
    let slug = slugify(item.title);
    if (usedSlugs.has(slug) || !slug) slug = `${slug || "product"}-${item.parentAsin.toLowerCase()}`;
    usedSlugs.add(slug);

    const priceCents = item.priceCents ?? randomInt(fallbackLow, fallbackHigh);

    // About a third of the catalogue is discounted, same as before.
    const discounted = random() < 0.35;
    const listPriceCents = discounted
      ? Math.round((priceCents * (1 + randomInt(10, 45) / 100)) / 100) * 100 - 1
      : null;

    rows.push({
      slug,
      title: item.title,
      brand: item.brand,
      description: item.description,
      categoryId,
      priceCents,
      listPriceCents,
      rating: item.rating ?? Math.round((3.2 + random() * 1.8) * 10) / 10,
      reviewCount: item.reviewCount ?? randomInt(0, 2400),
      stock: random() < 0.08 ? 0 : randomInt(1, 180),
      imageUrl: item.imageUrl,
      extraImages: item.extraImages,
      attributes: JSON.stringify({ Brand: item.brand, Category: category.name }),
      isFeatured: random() < 0.06,
    });
  }

  return rows;
}

/* ------------------------------------------------------------------- main */

async function main() {
  console.log(`Seeding ${CATEGORIES.length} categories from Amazon Reviews 2023 data...`);

  // Clear catalogue tables. Dependent rows (cart items, wishlist entries,
  // reviews) cascade; orders deliberately do not, since order_items keep a
  // snapshot and set product_id to null instead.
  await db.delete(schema.reviews);
  await db.delete(schema.cartItems);
  await db.delete(schema.wishlistItems);
  await db.delete(schema.products);
  await db.delete(schema.categories);

  const insertedCategories = await db
    .insert(schema.categories)
    .values(
      CATEGORIES.map((c, index) => ({
        slug: c.slug,
        name: c.name,
        description: c.description,
        // The first real product image in the category -- real and
        // correctly matched, same as every product photo now.
        imageUrl: AMAZON_PRODUCTS[c.slug]?.[0]?.imageUrl ?? "",
        sortOrder: index,
      })),
    )
    .returning({ id: schema.categories.id, slug: schema.categories.slug });

  console.log(`  categories: ${insertedCategories.length}`);

  let productTotal = 0;
  let reviewTotal = 0;

  for (const category of CATEGORIES) {
    const row = insertedCategories.find((c) => c.slug === category.slug);
    if (!row) throw new Error(`Category not inserted: ${category.slug}`);

    const products = buildProducts(row.id, category);

    // Chunked: a single insert of 500 rows exceeds the HTTP driver's limits.
    for (let i = 0; i < products.length; i += 50) {
      const chunk = products.slice(i, i + 50);
      const inserted = await db
        .insert(schema.products)
        .values(chunk)
        .returning({ id: schema.products.id });
      productTotal += inserted.length;

      // A few synthetic review rows per product, so the product page and
      // histogram have something to read beyond the denormalised count.
      const reviewRows = inserted.flatMap(({ id }) =>
        pickSome(REVIEW_TEMPLATES, randomInt(0, 4)).map((template) => ({
          productId: id,
          userId: null,
          authorName: pick(REVIEW_AUTHORS),
          rating: template.rating,
          title: template.title,
          body: template.body,
        })),
      );

      if (reviewRows.length > 0) {
        for (let j = 0; j < reviewRows.length; j += 100) {
          await db.insert(schema.reviews).values(reviewRows.slice(j, j + 100));
        }
        reviewTotal += reviewRows.length;
      }
    }

    console.log(`  ${category.name}: ${products.length} products`);
  }

  console.log(`Done. ${productTotal} products, ${reviewTotal} reviews.`);
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
