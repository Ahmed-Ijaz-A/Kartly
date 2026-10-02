/**
 * Kartly catalogue seed.
 *
 * Generates ~500 products across 10 categories, plus reviews.
 *
 * Deterministic: a seeded PRNG drives every price, rating and stock level, so
 * re-running produces the same catalogue rather than a different one. Safe to
 * run repeatedly -- it clears the catalogue tables first.
 *
 * Data sources are free and allowed:
 *   - Product text is generated here from hand-written brand and model names.
 *     Nothing is scraped, and no real retailer's copy is reproduced.
 *   - Images come from Lorem Picsum (https://picsum.photos), which serves
 *     Unsplash photography for free placeholder use. URLs are seeded by slug,
 *     so a given product always gets the same image.
 */
import { config } from "dotenv";

config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "../src/db/schema";

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
const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)];

function pickSome<T>(items: readonly T[], count: number): T[] {
  const pool = [...items];
  const out: T[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    out.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  }
  return out;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 150);
}

/** Lorem Picsum, seeded by slug so each product keeps a stable image. */
const imageUrl = (slug: string, variant: number, size = 800) =>
  `https://picsum.photos/seed/kartly-${slug}-${variant}/${size}/${size}`;

/* ------------------------------------------------------------ source data */

type CategorySeed = {
  slug: string;
  name: string;
  description: string;
  brands: readonly string[];
  /** [product noun, low price in cents, high price in cents] */
  items: readonly (readonly [string, number, number])[];
  modifiers: readonly string[];
  features: readonly string[];
  materials: readonly string[];
};

const CATEGORIES: readonly CategorySeed[] = [
  {
    slug: "electronics",
    name: "Electronics",
    description: "Audio, displays, and everyday tech that earns its desk space.",
    brands: ["Nordvane", "Kestrel Audio", "Lumenix", "Pulseform", "Atlas Labs", "Verity"],
    items: [
      ["Wireless Headphones", 4900, 34900],
      ["Bluetooth Speaker", 2900, 19900],
      ["Noise Cancelling Earbuds", 3900, 24900],
      ["4K Monitor", 17900, 69900],
      ["Mechanical Keyboard", 5900, 21900],
      ["Wireless Mouse", 1900, 9900],
      ["Webcam", 3400, 17900],
      ["Portable Power Bank", 2400, 11900],
      ["USB-C Hub", 2900, 12900],
      ["Smart Doorbell", 6900, 24900],
    ],
    modifiers: ["Pro", "Studio", "Mini", "Max", "Air", "Core", "Elite"],
    features: ["Bluetooth 5.3", "USB-C charging", "40h battery", "Low latency", "Fast charge"],
    materials: ["Aluminium", "ABS plastic", "Recycled polymer", "Anodised alloy"],
  },
  {
    slug: "home-kitchen",
    name: "Home & Kitchen",
    description: "Cookware, small appliances and the quiet workhorses of a kitchen.",
    brands: ["Hearthline", "Copperlane", "Marlow & Finch", "Granby", "Stonebrook"],
    items: [
      ["Cast Iron Skillet", 2900, 12900],
      ["Stand Mixer", 14900, 54900],
      ["Espresso Machine", 12900, 89900],
      ["Chef Knife", 3900, 22900],
      ["Nonstick Cookware Set", 7900, 39900],
      ["Electric Kettle", 2400, 13900],
      ["Air Fryer", 5900, 27900],
      ["Blender", 3900, 29900],
      ["Food Storage Set", 1900, 8900],
      ["Cutting Board", 1400, 7900],
    ],
    modifiers: ["Classic", "Professional", "Compact", "Everyday", "Heritage"],
    features: ["Dishwasher safe", "Oven safe to 500F", "BPA free", "Cool-touch handle"],
    materials: ["Cast iron", "Stainless steel", "Borosilicate glass", "Bamboo", "Ceramic"],
  },
  {
    slug: "sports-outdoors",
    name: "Sports & Outdoors",
    description: "Training gear and kit for getting outside.",
    brands: ["Ironridge", "Summitline", "Trailform", "Northbound", "Grit & Grain"],
    items: [
      ["Adjustable Dumbbell Set", 9900, 59900],
      ["Yoga Mat", 1900, 9900],
      ["Resistance Band Set", 1400, 5900],
      ["Kettlebell", 2900, 16900],
      ["Hiking Backpack", 4900, 24900],
      ["Insulated Water Bottle", 1900, 5900],
      ["Camping Tent", 8900, 44900],
      ["Foam Roller", 1900, 6900],
      ["Jump Rope", 1200, 4900],
      ["Trekking Poles", 2900, 14900],
    ],
    modifiers: ["Trail", "Summit", "Daily", "Expedition", "Alpine"],
    features: ["Rust resistant", "Non-slip grip", "Packs flat", "Weatherproof"],
    materials: ["Cast iron", "Ripstop nylon", "Natural rubber", "Anodised aluminium"],
  },
  {
    slug: "books",
    name: "Books",
    description: "Fiction, reference and the kind of book you actually finish.",
    brands: ["Redthorn Press", "Harbour House", "Ink & Argument", "Verso Lane"],
    items: [
      ["Hardcover Novel", 1200, 3200],
      ["Cookbook", 1900, 4900],
      ["Photography Collection", 2900, 7900],
      ["Field Guide", 1400, 3900],
      ["Paperback Thriller", 900, 2200],
      ["Design Reference", 2400, 6900],
      ["Biography", 1400, 3600],
      ["Essay Collection", 1200, 3200],
      ["Children's Picture Book", 900, 2400],
      ["Pocket Notebook", 700, 2400],
    ],
    modifiers: ["Illustrated", "Annotated", "Collector's", "Revised", "Pocket"],
    features: ["Sewn binding", "Acid-free paper", "Ribbon marker", "Foil stamped"],
    materials: ["Hardcover", "Paperback", "Linen bound", "Cloth bound"],
  },
  {
    slug: "clothing",
    name: "Clothing",
    description: "Everyday wear built to survive the wash.",
    brands: ["Fieldstone", "Marrow", "Oakcut", "Weft & Warp", "Common Thread"],
    items: [
      ["Merino Crew Sweater", 4900, 18900],
      ["Oxford Shirt", 3900, 12900],
      ["Chino Trousers", 4400, 14900],
      ["Rain Shell", 7900, 29900],
      ["Wool Socks", 1200, 3900],
      ["Denim Jacket", 6900, 24900],
      ["Everyday T-Shirt", 1900, 5900],
      ["Knit Beanie", 1400, 4900],
      ["Canvas Shorts", 2900, 8900],
      ["Leather Belt", 2400, 9900],
    ],
    modifiers: ["Heavyweight", "Lightweight", "Relaxed", "Tailored", "Everyday"],
    features: ["Machine washable", "Reinforced seams", "Breathable", "Pre-shrunk"],
    materials: ["Merino wool", "Organic cotton", "Linen", "Recycled polyester", "Denim"],
  },
  {
    slug: "beauty",
    name: "Beauty",
    description: "Skincare and grooming without the ten-step routine.",
    brands: ["Alder & Ash", "Lumen Skin", "Petal Lab", "Still Hours"],
    items: [
      ["Daily Moisturiser", 1900, 6900],
      ["Vitamin C Serum", 2400, 8900],
      ["Gentle Cleanser", 1400, 4900],
      ["Mineral Sunscreen", 1900, 4900],
      ["Lip Balm Set", 900, 2900],
      ["Hair Oil", 1600, 5400],
      ["Shaving Cream", 1200, 3900],
      ["Clay Face Mask", 1600, 4900],
      ["Hand Cream", 1100, 3400],
      ["Makeup Brush Set", 2400, 9900],
    ],
    modifiers: ["Daily", "Overnight", "Sensitive", "Replenishing", "Clarifying"],
    features: ["Fragrance free", "Dermatologist tested", "Non-comedogenic", "Cruelty free"],
    materials: ["Glass bottle", "Recycled tube", "Aluminium tin", "Pump bottle"],
  },
  {
    slug: "toys-games",
    name: "Toys & Games",
    description: "Board games, puzzles and things that survive a six-year-old.",
    brands: ["Tinderbox Games", "Little Harbour", "Meadowpeg", "Brightside"],
    items: [
      ["Strategy Board Game", 2900, 7900],
      ["1000 Piece Jigsaw", 1400, 3900],
      ["Wooden Block Set", 2400, 7900],
      ["Card Game", 1200, 3200],
      ["Plush Bear", 1600, 5400],
      ["Model Building Kit", 2900, 12900],
      ["Science Kit", 2400, 8900],
      ["Ride-On Toy", 4900, 18900],
      ["Puzzle Cube", 900, 3200],
      ["Art Supply Set", 1900, 6900],
    ],
    modifiers: ["Deluxe", "Family", "Junior", "Collector's", "Travel"],
    features: ["Ages 6+", "2-5 players", "Storage box included", "Non-toxic finish"],
    materials: ["FSC birch ply", "Recycled card", "Organic cotton", "ABS plastic"],
  },
  {
    slug: "office",
    name: "Office",
    description: "Desk, chair and the small things that make a workday bearable.",
    brands: ["Draft & Co", "Meridian Desk", "Paperweight", "Stilt"],
    items: [
      ["Ergonomic Desk Chair", 14900, 79900],
      ["Standing Desk", 24900, 99900],
      ["Desk Lamp", 2900, 14900],
      ["Monitor Arm", 3900, 19900],
      ["Notebook Set", 1200, 4900],
      ["Fountain Pen", 2400, 14900],
      ["Desk Organiser", 1900, 6900],
      ["Laptop Stand", 2400, 9900],
      ["Whiteboard", 2900, 12900],
      ["Filing Cabinet", 7900, 29900],
    ],
    modifiers: ["Ergonomic", "Compact", "Executive", "Minimal", "Adjustable"],
    features: ["Tool-free assembly", "Cable management", "Height adjustable", "5-year warranty"],
    materials: ["Powder-coated steel", "Solid oak", "Recycled aluminium", "Mesh"],
  },
  {
    slug: "pet-supplies",
    name: "Pet Supplies",
    description: "Kit for the other members of the household.",
    brands: ["Paw & Pine", "Rufflane", "Thicket", "Good Dog Co"],
    items: [
      ["Dog Bed", 3900, 17900],
      ["Cat Tree", 5900, 24900],
      ["Slow Feeder Bowl", 1400, 4900],
      ["Leash and Collar Set", 1900, 6900],
      ["Pet Carrier", 3900, 14900],
      ["Scratching Post", 2400, 8900],
      ["Grooming Brush", 1200, 3900],
      ["Chew Toy Bundle", 1400, 4400],
      ["Litter Box", 2400, 9900],
      ["Pet Water Fountain", 2900, 8900],
    ],
    modifiers: ["Orthopaedic", "Washable", "Heavy-duty", "Calming", "Compact"],
    features: ["Machine washable cover", "Non-slip base", "Chew resistant", "Odour resistant"],
    materials: ["Memory foam", "Sisal rope", "Stainless steel", "Recycled fabric"],
  },
  {
    slug: "garden",
    name: "Garden",
    description: "Tools and planters for a balcony or an acre.",
    brands: ["Rootwork", "Hedge & Hollow", "Terra Forge", "Greenshore"],
    items: [
      ["Raised Garden Bed", 5900, 22900],
      ["Pruning Shears", 1900, 6900],
      ["Watering Can", 1400, 4900],
      ["Garden Hose", 2400, 9900],
      ["Planter Pot Set", 1900, 7900],
      ["Hand Tool Set", 2400, 8900],
      ["Compost Bin", 4900, 17900],
      ["Solar Garden Lights", 2400, 8900],
      ["Potting Bench", 8900, 29900],
      ["Grow Light", 2900, 12900],
    ],
    modifiers: ["Heavy-duty", "Weatherproof", "Compact", "Classic", "All-season"],
    features: ["Rust resistant", "UV stable", "Frost proof", "Drainage holes"],
    materials: ["Cedar", "Galvanised steel", "Terracotta", "Recycled plastic"],
  },
] as const;

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

function buildDescription(
  title: string,
  category: CategorySeed,
  material: string,
  featureList: string[],
): string {
  const openers = [
    `The ${title} is built for people who would rather buy once.`,
    `A straightforward take on the ${category.name.toLowerCase()} staple, without the padding.`,
    `We designed the ${title} around the parts people actually touch.`,
    `Made in ${material.toLowerCase()}, the ${title} is meant to stay in service for years.`,
  ];
  const closers = [
    "Backed by a two-year guarantee and a returns window that does not require an argument.",
    "Ships flat in recyclable packaging, with no plastic inserts.",
    "Tested against daily use rather than a spec sheet.",
    "If it is not right, send it back within 30 days.",
  ];
  return [
    pick(openers),
    `Key features: ${featureList.join(", ").toLowerCase()}.`,
    `Primary material is ${material.toLowerCase()}.`,
    pick(closers),
  ].join(" ");
}

type ProductInsert = typeof schema.products.$inferInsert;

function buildProducts(categoryId: number, category: CategorySeed, perCategory: number) {
  const rows: ProductInsert[] = [];
  const usedSlugs = new Set<string>();

  for (let i = 0; i < perCategory; i++) {
    const [noun, lowCents, highCents] = category.items[i % category.items.length];
    const brand = pick(category.brands);
    const modifier = pick(category.modifiers);
    const title = `${brand} ${modifier} ${noun}`;

    let slug = slugify(title);
    if (usedSlugs.has(slug)) slug = `${slug}-${i + 1}`;
    usedSlugs.add(slug);

    // Price in whole cents, nudged to a .99 ending the way retail prices run.
    const basePrice = randomInt(lowCents, highCents);
    const priceCents = Math.max(99, Math.round(basePrice / 100) * 100 - 1);

    // About a third of the catalogue is discounted.
    const discounted = random() < 0.35;
    const listPriceCents = discounted
      ? Math.round((priceCents * (1 + randomInt(10, 45) / 100)) / 100) * 100 - 1
      : null;

    // Ratings skew high, as real catalogues do, but not uniformly.
    const rating = Math.round((3.2 + random() * 1.8) * 10) / 10;
    const reviewCount = randomInt(0, 2400);

    const material = pick(category.materials);
    const featureList = pickSome(category.features, 3);

    rows.push({
      slug,
      title,
      brand,
      description: buildDescription(title, category, material, featureList),
      categoryId,
      priceCents,
      listPriceCents,
      rating,
      reviewCount,
      stock: random() < 0.08 ? 0 : randomInt(1, 180),
      imageUrl: imageUrl(slug, 1),
      extraImages: [imageUrl(slug, 2), imageUrl(slug, 3), imageUrl(slug, 4)],
      attributes: JSON.stringify({
        Brand: brand,
        Material: material,
        Features: featureList.join(", "),
        Category: category.name,
      }),
      isFeatured: random() < 0.06,
    });
  }

  return rows;
}

/* ------------------------------------------------------------------- main */

async function main() {
  const perCategory = 50;
  console.log(`Seeding ${CATEGORIES.length} categories x ${perCategory} products...`);

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
        imageUrl: imageUrl(`category-${c.slug}`, 1, 600),
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

    const products = buildProducts(row.id, category, perCategory);

    // Chunked: a single insert of 500 rows exceeds the HTTP driver's limits.
    for (let i = 0; i < products.length; i += 50) {
      const chunk = products.slice(i, i + 50);
      const inserted = await db
        .insert(schema.products)
        .values(chunk)
        .returning({ id: schema.products.id });
      productTotal += inserted.length;

      // A few real review rows per product, so the product page and histogram
      // have something true to read rather than only the denormalised count.
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
