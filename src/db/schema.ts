import { pgTable, text, integer, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// 1. Users Table
export const users = pgTable("users", {
  id: text("id").primaryKey(), // Firebase Auth uid
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  goalCalories: integer("goal_calories").default(2000).notNull(),
  goalProteinG: integer("goal_protein_g").default(150).notNull(),
  goalCarbsG: integer("goal_carbs_g").default(200).notNull(),
  goalFatG: integer("goal_fat_g").default(65).notNull(),
  role: text("role").default("USER").notNull(), // 'USER', 'RESTAURANT_OWNER'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 2. Meal Logs Table
export const mealLogs = pgTable("meal_logs", {
  id: text("id").primaryKey(), // UUID string
  userId: text("user_id")
    .references(() => users.id)
    .notNull(),
  mealName: text("meal_name").notNull(),
  calories: integer("calories").notNull(),
  proteinG: numeric("protein_g").notNull(),
  carbsG: numeric("carbs_g").notNull(),
  fatG: numeric("fat_g").notNull(),
  fiberG: numeric("fiber_g").notNull(),
  portionMultiplier: numeric("portion_multiplier").default("1.0").notNull(),
  mealType: text("meal_type").notNull(), // 'BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'
  source: text("source").notNull(), // 'AI_RECIPE', 'MANUAL', 'MENU_ITEM'
  loggedAt: timestamp("logged_at").defaultNow().notNull(),
});

// 3. Restaurants Table
export const restaurants = pgTable("restaurants", {
  id: text("id").primaryKey(), // UUID string
  ownerUserId: text("owner_user_id")
    .references(() => users.id)
    .notNull(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  cuisineType: text("cuisine_type").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

// 4. Menu Items Table
export const menuItems = pgTable("menu_items", {
  id: text("id").primaryKey(), // UUID string
  restaurantId: text("restaurant_id")
    .references(() => restaurants.id)
    .notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: numeric("price").notNull(),
  category: text("category").notNull(),
  calories: integer("calories").default(0).notNull(),
  proteinG: numeric("protein_g").default("0.0").notNull(),
  carbsG: numeric("carbs_g").default("0.0").notNull(),
  fatG: numeric("fat_g").default("0.0").notNull(),
  fiberG: numeric("fiber_g").default("0.0").notNull(),
  isAvailable: boolean("is_available").default(true).notNull(),
  photoUrl: text("photo_url"),
});

// 5. Orders Table
export const orders = pgTable("orders", {
  id: text("id").primaryKey(), // UUID string
  userId: text("user_id")
    .references(() => users.id)
    .notNull(),
  restaurantId: text("restaurant_id")
    .references(() => restaurants.id)
    .notNull(),
  status: text("status").default("PLACED").notNull(), // 'PLACED', 'ACCEPTED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'
  totalPrice: numeric("total_price").notNull(),
  deliveryAddress: text("delivery_address").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 6. Order Items Table
export const orderItems = pgTable("order_items", {
  id: text("id").primaryKey(), // UUID string
  orderId: text("order_id")
    .references(() => orders.id)
    .notNull(),
  menuItemId: text("menu_item_id")
    .references(() => menuItems.id)
    .notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price").notNull(),
});

// 7. Recipe Analyses Table
export const recipeAnalyses = pgTable("recipe_analyses", {
  id: text("id").primaryKey(), // UUID string
  userId: text("user_id")
    .references(() => users.id)
    .notNull(),
  sourceUrl: text("source_url"),
  dishName: text("dish_name").notNull(),
  perServingCalories: integer("per_serving_calories").notNull(),
  perServingProteinG: numeric("per_serving_protein_g").notNull(),
  perServingCarbsG: numeric("per_serving_carbs_g").notNull(),
  perServingFatG: numeric("per_serving_fat_g").notNull(),
  perServingFiberG: numeric("per_serving_fiber_g").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relationships
export const usersRelations = relations(users, ({ many }) => ({
  mealLogs: many(mealLogs),
  restaurants: many(restaurants),
  orders: many(orders),
  analyses: many(recipeAnalyses),
}));

export const mealLogsRelations = relations(mealLogs, ({ one }) => ({
  user: one(users, { fields: [mealLogs.userId], references: [users.id] }),
}));

export const restaurantsRelations = relations(restaurants, ({ one, many }) => ({
  owner: one(users, { fields: [restaurants.ownerUserId], references: [users.id] }),
  menuItems: many(menuItems),
  orders: many(orders),
}));

export const menuItemsRelations = relations(menuItems, ({ one, many }) => ({
  restaurant: one(restaurants, { fields: [menuItems.restaurantId], references: [restaurants.id] }),
  orderItems: many(orderItems),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  restaurant: one(restaurants, { fields: [orders.restaurantId], references: [restaurants.id] }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  menuItem: one(menuItems, { fields: [orderItems.menuItemId], references: [menuItems.id] }),
}));

export const recipeAnalysesRelations = relations(recipeAnalyses, ({ one }) => ({
  user: one(users, { fields: [recipeAnalyses.userId], references: [users.id] }),
}));
