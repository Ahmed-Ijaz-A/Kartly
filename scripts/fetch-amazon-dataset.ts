/**
 * Catalogue data source: the Amazon Reviews 2023 dataset (McAuley Lab, UC San
 * Diego) -- https://amazon-reviews-2023.github.io/, hosted at
 * huggingface.co/datasets/McAuley-Lab/Amazon-Reviews-2023. Academic dataset,
 * freely downloadable for research and coursework use.
 *
 * Real listings -- genuine title, description, brand/author ("store") and a
 * multi-angle photo set per product, all three already matched to each other
 * by construction. That directly fixes "images and descriptions don't match":
 * they can't, because both come from the same real listing. The trade-off
 * (and it is one, raised and accepted for this exercise): this uses real
 * brand names and real product photography, which the earlier Wikipedia-
 * sourced catalogue deliberately avoided to keep Kartly's own invented
 * brands from appearing to use someone else's product shots. Noted here so
 * it's a visible decision, not a silent one.
 *
 * One-off tool, not run by the app. Output: scripts/amazon-products.json,
 * which scripts/seed.ts reads. Re-run only if the category mapping changes.
 *
 * Method: the per-category metadata files are tens of MB to multiple GB of
 * raw JSONL each (not Parquet, so Hugging Face's dataset-viewer API can't
 * preview them -- the repo ships a custom loading script instead). Rather
 * than downloading any of them whole, this issues an HTTP Range request for
 * a byte-prefix of each file (Hugging Face's CDN supports it) -- enough
 * complete JSON lines to select 50 clean candidates per category, nothing
 * close to the full file.
 */
import fs from "node:fs";

const USER_AGENT =
  "KartlyCatalogueBuild/1.0 (24h coursework project; contact sentinel.fyp.fast@gmail.com)";

/** Kartly category slug -> the dataset's matching per-category metadata file. */
const CATEGORY_FILES: Record<string, string> = {
  electronics: "meta_Electronics.jsonl",
  "home-kitchen": "meta_Home_and_Kitchen.jsonl",
  "sports-outdoors": "meta_Sports_and_Outdoors.jsonl",
  books: "meta_Books.jsonl",
  clothing: "meta_Clothing_Shoes_and_Jewelry.jsonl",
  beauty: "meta_Beauty_and_Personal_Care.jsonl",
  "toys-games": "meta_Toys_and_Games.jsonl",
  office: "meta_Office_Products.jsonl",
  "pet-supplies": "meta_Pet_Supplies.jsonl",
  garden: "meta_Patio_Lawn_and_Garden.jsonl",
};

const PER_CATEGORY = 50;
/** Byte prefix requested per file -- comfortably more than enough complete
 * records to find 50 clean ones after filtering (~200-330 survive from this
 * much in every category, checked empirically before committing to this
 * size). */
const RANGE_BYTES = 1_500_000;

// Defensive keyword filter: this is a general retail dataset, not curated for
// a coursework storefront. Applied to title + description, case-insensitive.
const BLOCKLIST = [
  /\bsex\b/i,
  /\bsexual\b/i,
  /\bvibrator\b/i,
  /\bdildo\b/i,
  /\banal\b/i,
  /\bfetish\b/i,
  /\bporn\b/i,
  /\berotic\b/i,
  /\bescort\b/i,
  /\bnude\b/i,
  /\bxxx\b/i,
  /\bweapon\b/i,
  /\bfirearm\b/i,
  /\bammunition\b/i,
  /\bgun\b/i,
];

type RawImage = { thumb?: string | null; large?: string | null; hi_res?: string | null };
type RawProduct = {
  parent_asin?: string;
  title?: string;
  description?: string[];
  price?: number | string | null;
  store?: string | null;
  average_rating?: number;
  rating_number?: number;
  images?: RawImage[];
  features?: string[];
};

type CleanProduct = {
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

function collapseWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function cleanTitle(raw: string): string | null {
  const title = collapseWhitespace(raw);
  if (title.length < 5 || title.length > 300) return null;
  // Hard cap for card/detail display -- the schema allows 240, but a title
  // anywhere near that reads as SEO-stuffed rather than a real product name.
  return title.length > 140 ? title.slice(0, 137).trimEnd() + "…" : title;
}

function cleanDescription(raw: string[]): string | null {
  const text = collapseWhitespace(raw.join(" "));
  if (text.length < 20) return null;
  return text.length > 700 ? text.slice(0, 697).trimEnd() + "…" : text;
}

function isSafe(title: string, description: string): boolean {
  const combined = `${title} ${description}`;
  return !BLOCKLIST.some((pattern) => pattern.test(combined));
}

/** Dollars (numeric or a "$12.34"-ish string) -> integer cents, if parseable and plausible. */
function parsePriceCents(raw: RawProduct["price"]): number | null {
  if (raw === null || raw === undefined) return null;
  const n = typeof raw === "number" ? raw : parseFloat(String(raw).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n) || n < 1 || n > 2000) return null;
  return Math.round(n * 100);
}

function bestImage(img: RawImage): string | null {
  return img.hi_res || img.large || null;
}

function cleanProduct(raw: RawProduct): CleanProduct | null {
  if (!raw.parent_asin || !raw.title) return null;

  const title = cleanTitle(raw.title);
  if (!title) return null;

  const description = cleanDescription(raw.description ?? []);
  if (!description) return null;

  if (!isSafe(title, description)) return null;

  const images = (raw.images ?? []).map(bestImage).filter((u): u is string => Boolean(u));
  if (images.length === 0) return null;
  const [imageUrl, ...rest] = [...new Set(images)];
  const extraImages = rest.slice(0, 5);

  const rating =
    typeof raw.average_rating === "number" && raw.average_rating >= 0 && raw.average_rating <= 5
      ? raw.average_rating
      : null;
  const reviewCount =
    typeof raw.rating_number === "number" && raw.rating_number >= 0 ? raw.rating_number : null;

  // "store" doubles as author/contributor credit for Books; falls back to
  // the title's first couple of words when absent, same as any other brand.
  const brand = collapseWhitespace(raw.store ?? "").slice(0, 120) || title.split(" ").slice(0, 2).join(" ");

  return {
    parentAsin: raw.parent_asin,
    title,
    brand,
    description,
    priceCents: parsePriceCents(raw.price),
    rating,
    reviewCount,
    imageUrl,
    extraImages,
  };
}

async function fetchCategorySample(filename: string): Promise<string> {
  const url = `https://huggingface.co/datasets/McAuley-Lab/Amazon-Reviews-2023/resolve/main/raw/meta_categories/${filename}`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Range: `bytes=0-${RANGE_BYTES}` },
  });
  if (!res.ok && res.status !== 206) {
    throw new Error(`Range fetch failed for ${filename}: ${res.status}`);
  }
  return res.text();
}

function parseCandidates(raw: string): CleanProduct[] {
  const lines = raw.split("\n").filter(Boolean);
  const seen = new Set<string>();
  const out: CleanProduct[] = [];

  for (const line of lines) {
    let obj: RawProduct;
    try {
      obj = JSON.parse(line);
    } catch {
      continue; // last line of a byte-range request is routinely cut mid-record
    }
    const product = cleanProduct(obj);
    if (!product || seen.has(product.parentAsin)) continue;
    seen.add(product.parentAsin);
    out.push(product);
  }

  return out;
}

async function main() {
  const manifest: Record<string, CleanProduct[]> = {};

  for (const [slug, filename] of Object.entries(CATEGORY_FILES)) {
    const raw = await fetchCategorySample(filename);
    const candidates = parseCandidates(raw);
    const selected = candidates.slice(0, PER_CATEGORY);

    manifest[slug] = selected;
    console.log(
      `${slug}: ${candidates.length} clean candidates, took ${selected.length}` +
        (selected.length < PER_CATEGORY ? "  ⚠ fewer than requested" : ""),
    );
  }

  fs.writeFileSync("scripts/amazon-products.json", JSON.stringify(manifest, null, 2));
  const total = Object.values(manifest).reduce((sum, v) => sum + v.length, 0);
  console.log(`\nWrote scripts/amazon-products.json -- ${total} products across ${Object.keys(manifest).length} categories.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
