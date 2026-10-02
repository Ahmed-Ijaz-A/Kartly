/**
 * Kartly database schema.
 *
 * Two rules hold across this whole file:
 *   1. All money is an integer number of cents. No floats, no numeric columns.
 *   2. Anything a user owns carries a user_id that server code filters on.
 */
import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ users */

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    // Password hash only. A plaintext password must never reach this table.
    passwordHash: text("password_hash").notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("users_email_unique").on(t.email)],
);

/* ------------------------------------------------------------- categories */

export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 80 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    description: text("description").notNull().default(""),
    imageUrl: text("image_url").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [uniqueIndex("categories_slug_unique").on(t.slug)],
);

/* --------------------------------------------------------------- products */

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 160 }).notNull(),
    title: varchar("title", { length: 240 }).notNull(),
    brand: varchar("brand", { length: 120 }).notNull(),
    description: text("description").notNull(),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),

    // Money, in cents. priceCents is what we charge; listPriceCents is the
    // struck-through "was" price and is null when the item is not discounted.
    priceCents: integer("price_cents").notNull(),
    listPriceCents: integer("list_price_cents"),

    // Denormalised review aggregates, recomputed when a review is written.
    // real is fine here: it is a display average, never money.
    rating: real("rating").notNull().default(0),
    reviewCount: integer("review_count").notNull().default(0),

    stock: integer("stock").notNull().default(0),
    imageUrl: text("image_url").notNull(),
    // Additional gallery images; the primary image above is not repeated here.
    extraImages: text("extra_images").array().notNull().default(sql`'{}'::text[]`),
    // Descriptive, filterable key/value pairs, stored as a JSON object string
    // and rendered as the product spec table.
    attributes: text("attributes").notNull().default("{}"),

    isFeatured: boolean("is_featured").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("products_slug_unique").on(t.slug),
    index("products_category_idx").on(t.categoryId),
    index("products_price_idx").on(t.priceCents),
    index("products_rating_idx").on(t.rating),
    // Keyword search. Weighted so a title match outranks a description match.
    index("products_search_idx").using(
      "gin",
      sql`(
        setweight(to_tsvector('english', ${t.title}), 'A') ||
        setweight(to_tsvector('english', ${t.brand}), 'B') ||
        setweight(to_tsvector('english', ${t.description}), 'C')
      )`,
    ),
  ],
);

/* ------------------------------------------------------------------ carts */

/**
 * One open cart per user, or per anonymous session token for signed-out
 * visitors. The anonymous cart is merged into the user cart at login.
 */
export const carts = pgTable(
  "carts",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
    anonymousToken: varchar("anonymous_token", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("carts_user_unique").on(t.userId),
    uniqueIndex("carts_anonymous_token_unique").on(t.anonymousToken),
  ],
);

export const cartItems = pgTable(
  "cart_items",
  {
    id: serial("id").primaryKey(),
    cartId: integer("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  // One row per product per cart; quantity carries the count.
  (t) => [uniqueIndex("cart_items_cart_product_unique").on(t.cartId, t.productId)],
);

/* ----------------------------------------------------------------- orders */

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),

    // Unique: this is what makes Stripe webhook retries idempotent. Enforced
    // by the database, not by application logic.
    paymentIntentId: varchar("payment_intent_id", { length: 255 }).notNull(),

    status: varchar("status", { length: 32 }).notNull().default("paid"),

    // Totals frozen at purchase time, in cents. Never recomputed from the
    // catalogue afterwards.
    subtotalCents: integer("subtotal_cents").notNull(),
    shippingCents: integer("shipping_cents").notNull(),
    taxCents: integer("tax_cents").notNull(),
    totalCents: integer("total_cents").notNull(),

    shippingName: varchar("shipping_name", { length: 160 }).notNull(),
    shippingLine1: varchar("shipping_line1", { length: 200 }).notNull(),
    shippingLine2: varchar("shipping_line2", { length: 200 }).notNull().default(""),
    shippingCity: varchar("shipping_city", { length: 120 }).notNull(),
    shippingPostalCode: varchar("shipping_postal_code", { length: 32 }).notNull(),
    shippingCountry: varchar("shipping_country", { length: 2 }).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("orders_payment_intent_unique").on(t.paymentIntentId),
    index("orders_user_idx").on(t.userId),
  ],
);

/**
 * Line items copy the product's title, price and image at purchase time, so
 * later catalogue edits can never rewrite order history.
 */
export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
    titleSnapshot: varchar("title_snapshot", { length: 240 }).notNull(),
    imageUrlSnapshot: text("image_url_snapshot").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    quantity: integer("quantity").notNull(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

/* ---------------------------------------------------------------- reviews */

export const reviews = pgTable(
  "reviews",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    // Null for seeded reviews, which have no real account behind them.
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    authorName: varchar("author_name", { length: 120 }).notNull(),
    rating: integer("rating").notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("reviews_product_idx").on(t.productId)],
);

/* --------------------------------------------------------------- wishlist */

export const wishlistItems = pgTable(
  "wishlist_items",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("wishlist_user_product_unique").on(t.userId, t.productId)],
);

/* -------------------------------------------------------------- relations */

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  reviews: many(reviews),
}));

export const cartsRelations = relations(carts, ({ one, many }) => ({
  user: one(users, { fields: [carts.userId], references: [users.id] }),
  items: many(cartItems),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, { fields: [cartItems.cartId], references: [carts.id] }),
  product: one(products, { fields: [cartItems.productId], references: [products.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  product: one(products, { fields: [reviews.productId], references: [products.id] }),
}));

export const wishlistItemsRelations = relations(wishlistItems, ({ one }) => ({
  user: one(users, { fields: [wishlistItems.userId], references: [users.id] }),
  product: one(products, { fields: [wishlistItems.productId], references: [products.id] }),
}));
