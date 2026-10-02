import { and, asc, desc, eq, gte, lte, ne, sql, type SQL } from "drizzle-orm";

import { PAGE_SIZE, type SearchFilters } from "@/lib/search-params";

import { db } from ".";
import { categories, products, reviews } from "./schema";

/** Columns every product card needs. Kept in one place so grids stay uniform. */
const productCardColumns = {
  id: products.id,
  slug: products.slug,
  title: products.title,
  brand: products.brand,
  priceCents: products.priceCents,
  listPriceCents: products.listPriceCents,
  rating: products.rating,
  reviewCount: products.reviewCount,
  stock: products.stock,
  imageUrl: products.imageUrl,
};

export type ProductCard = {
  id: number;
  slug: string;
  title: string;
  brand: string;
  priceCents: number;
  listPriceCents: number | null;
  rating: number;
  reviewCount: number;
  stock: number;
  imageUrl: string;
};

/**
 * The exact expression the products_search_idx GIN index is built on. Written
 * once here so the query and the index can never drift apart -- if they do,
 * Postgres silently stops using the index and search gets slow.
 */
const searchVector = sql`(
  setweight(to_tsvector('english', ${products.title}), 'A') ||
  setweight(to_tsvector('english', ${products.brand}), 'B') ||
  setweight(to_tsvector('english', ${products.description}), 'C')
)`;

/**
 * Turn a user's words into a tsquery with prefix matching, so "dumb" finds
 * "dumbbells" while the user is still typing.
 *
 * Input is stripped to alphanumerics before it reaches to_tsquery: tsquery has
 * its own operator syntax (& | ! :*) and a raw string would both break on
 * punctuation and let a user inject operators.
 */
function buildTsQuery(raw: string): string | null {
  const terms = raw
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.replace(/[^a-z0-9]/g, ""))
    .filter(Boolean)
    .slice(0, 8);

  if (terms.length === 0) return null;
  return terms.map((term) => `${term}:*`).join(" & ");
}

function buildWhere(filters: SearchFilters, tsQuery: string | null): SQL | undefined {
  const clauses: SQL[] = [];

  if (tsQuery) {
    clauses.push(sql`${searchVector} @@ to_tsquery('english', ${tsQuery})`);
  }
  if (filters.category) {
    clauses.push(eq(categories.slug, filters.category));
  }
  if (filters.minCents !== null) {
    clauses.push(gte(products.priceCents, filters.minCents));
  }
  if (filters.maxCents !== null) {
    clauses.push(lte(products.priceCents, filters.maxCents));
  }
  if (filters.rating !== null) {
    clauses.push(gte(products.rating, filters.rating));
  }
  if (filters.inStock) {
    clauses.push(sql`${products.stock} > 0`);
  }

  return clauses.length > 0 ? and(...clauses) : undefined;
}

function buildOrderBy(filters: SearchFilters, tsQuery: string | null): SQL[] {
  switch (filters.sort) {
    case "price-asc":
      return [asc(products.priceCents)];
    case "price-desc":
      return [desc(products.priceCents)];
    case "rating":
      return [desc(products.rating), desc(products.reviewCount)];
    case "newest":
      return [desc(products.createdAt)];
    case "relevance":
    default:
      // With a query, rank by text relevance. Without one, "relevance" has no
      // meaning, so fall back to something defensible rather than arbitrary
      // insertion order.
      return tsQuery
        ? [
            desc(sql`ts_rank(${searchVector}, to_tsquery('english', ${tsQuery}))`),
            desc(products.rating),
          ]
        : [desc(products.rating), desc(products.reviewCount)];
  }
}

export type SearchResult = {
  products: ProductCard[];
  total: number;
  page: number;
  pageCount: number;
};

export async function searchProducts(filters: SearchFilters): Promise<SearchResult> {
  const tsQuery = buildTsQuery(filters.q);
  const where = buildWhere(filters, tsQuery);

  const rows = await db
    .select(productCardColumns)
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(where)
    .orderBy(...buildOrderBy(filters, tsQuery))
    .limit(PAGE_SIZE)
    .offset((filters.page - 1) * PAGE_SIZE);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(where);

  return {
    products: rows,
    total: count,
    page: filters.page,
    pageCount: Math.max(1, Math.ceil(count / PAGE_SIZE)),
  };
}

/* ------------------------------------------------------------- home page */

export async function getCategories() {
  return db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      description: categories.description,
      imageUrl: categories.imageUrl,
    })
    .from(categories)
    .orderBy(asc(categories.sortOrder));
}

export async function getFeaturedProducts(limit = 6): Promise<ProductCard[]> {
  return db
    .select(productCardColumns)
    .from(products)
    .where(and(eq(products.isFeatured, true), sql`${products.stock} > 0`))
    .orderBy(desc(products.rating))
    .limit(limit);
}

export async function getTopRatedProducts(limit = 6): Promise<ProductCard[]> {
  return db
    .select(productCardColumns)
    .from(products)
    .where(and(gte(products.reviewCount, 200), sql`${products.stock} > 0`))
    .orderBy(desc(products.rating), desc(products.reviewCount))
    .limit(limit);
}

/** Biggest percentage savings, not biggest absolute discount. */
export async function getDealProducts(limit = 6): Promise<ProductCard[]> {
  return db
    .select(productCardColumns)
    .from(products)
    .where(
      and(
        sql`${products.listPriceCents} is not null`,
        sql`${products.listPriceCents} > ${products.priceCents}`,
        sql`${products.stock} > 0`,
      ),
    )
    .orderBy(
      desc(
        sql`(${products.listPriceCents} - ${products.priceCents})::float / ${products.listPriceCents}`,
      ),
    )
    .limit(limit);
}

export async function getProductCount(): Promise<number> {
  return db.$count(products);
}

/* ---------------------------------------------------------- product page */

export async function getProductBySlug(slug: string) {
  const [row] = await db
    .select({
      id: products.id,
      slug: products.slug,
      title: products.title,
      brand: products.brand,
      description: products.description,
      priceCents: products.priceCents,
      listPriceCents: products.listPriceCents,
      rating: products.rating,
      reviewCount: products.reviewCount,
      stock: products.stock,
      imageUrl: products.imageUrl,
      extraImages: products.extraImages,
      attributes: products.attributes,
      categoryId: products.categoryId,
      categoryName: categories.name,
      categorySlug: categories.slug,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.slug, slug))
    .limit(1);

  return row ?? null;
}

export async function getProductReviews(productId: number) {
  return db
    .select({
      id: reviews.id,
      authorName: reviews.authorName,
      rating: reviews.rating,
      title: reviews.title,
      body: reviews.body,
      createdAt: reviews.createdAt,
    })
    .from(reviews)
    .where(eq(reviews.productId, productId))
    .orderBy(desc(reviews.createdAt))
    .limit(20);
}

/** Counts per star rating, for the review histogram. */
export async function getReviewHistogram(productId: number) {
  const rows = await db
    .select({
      rating: reviews.rating,
      count: sql<number>`count(*)::int`,
    })
    .from(reviews)
    .where(eq(reviews.productId, productId))
    .groupBy(reviews.rating);

  const histogram: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const row of rows) histogram[row.rating] = row.count;
  return histogram;
}

export async function getRelatedProducts(
  categoryId: number,
  excludeProductId: number,
  limit = 6,
): Promise<ProductCard[]> {
  return db
    .select(productCardColumns)
    .from(products)
    .where(and(eq(products.categoryId, categoryId), ne(products.id, excludeProductId)))
    .orderBy(desc(products.rating))
    .limit(limit);
}
