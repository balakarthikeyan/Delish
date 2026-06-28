import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import * as cheerio from "cheerio";
import { GoogleGenAI } from "@google/genai";
import { eq, and, desc } from "drizzle-orm";
import { db } from "./src/db/index.ts";
import {
  users,
  mealLogs,
  restaurants,
  menuItems,
  orders,
  orderItems,
  recipeAnalyses,
} from "./src/db/schema.ts";
import { requireAuth, AuthRequest } from "./src/middleware/auth.ts";
import { getOrCreateUser } from "./src/db/users.ts";

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with telemetry User-Agent header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Helper to generate UUIDs
function generateUUID() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Seed Database on startup if empty
async function seedDatabase() {
  try {
    const existingRestaurants = await db.select().from(restaurants).limit(1);
    if (existingRestaurants.length > 0) {
      console.log("Database already seeded.");
      return;
    }

    console.log("Seeding database...");

    // 1. Seed Users
    await db.insert(users).values([
      {
        id: "demo-user-id",
        name: "Demo User",
        email: "user@delish.com",
        goalCalories: 2200,
        goalProteinG: 160,
        goalCarbsG: 220,
        goalFatG: 70,
        role: "USER",
      },
      {
        id: "demo-owner-id",
        name: "The Macro Chef",
        email: "owner@delish.com",
        goalCalories: 2000,
        goalProteinG: 150,
        goalCarbsG: 200,
        goalFatG: 65,
        role: "RESTAURANT_OWNER",
      },
    ]).onConflictDoNothing();

    // 2. Seed Restaurant
    await db.insert(restaurants).values([
      {
        id: "restaurant-1",
        ownerUserId: "demo-owner-id",
        name: "The Macro Kitchen",
        address: "123 Fit St",
        cuisineType: "Healthy",
        isActive: true,
      },
    ]).onConflictDoNothing();

    // 3. Seed Menu Items
    await db.insert(menuItems).values([
      {
        id: "menu-item-1",
        restaurantId: "restaurant-1",
        name: "Spicy Chicken & Quinoa Bowl",
        description: "Tender chicken breast, tri-color quinoa, roasted broccoli, avocado, spicy tahini sauce.",
        price: "14.99",
        category: "Bowls",
        calories: 620,
        proteinG: "45.0",
        carbsG: "55.0",
        fatG: "18.0",
        fiberG: "8.0",
        isAvailable: true,
        photoUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&auto=format&fit=crop",
      },
      {
        id: "menu-item-2",
        restaurantId: "restaurant-1",
        name: "Double Chocolate Whey Shake",
        description: "Grass-fed whey protein, oat milk, creamy almond butter, banana, cacao nibs.",
        price: "7.99",
        category: "Shakes",
        calories: 450,
        proteinG: "32.0",
        carbsG: "42.0",
        fatG: "14.0",
        fiberG: "6.0",
        isAvailable: true,
        photoUrl: "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=400&auto=format&fit=crop",
      },
      {
        id: "menu-item-3",
        restaurantId: "restaurant-1",
        name: "Superfood Salmon Salad",
        description: "Grilled wild-caught salmon, baby kale, organic blueberries, walnuts, hemp seeds, lemon dressing.",
        price: "16.99",
        category: "Salads",
        calories: 550,
        proteinG: "38.0",
        carbsG: "18.0",
        fatG: "36.0",
        fiberG: "5.0",
        isAvailable: true,
        photoUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop",
      },
      {
        id: "menu-item-4",
        restaurantId: "restaurant-1",
        name: "Lean Beef Power Burger",
        description: "Grass-fed beef patty, toasted sweet potato bun, fresh butter lettuce, ripe tomato, low-fat cheddar, sliced avocado.",
        price: "13.99",
        category: "Burgers",
        calories: 580,
        proteinG: "42.0",
        carbsG: "38.0",
        fatG: "22.0",
        fiberG: "5.0",
        isAvailable: true,
        photoUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop",
      },
      {
        id: "menu-item-5",
        restaurantId: "restaurant-1",
        name: "High-Protein Pesto Pasta",
        description: "Chickpea penne pasta, fresh house-made basil walnut pesto, cherry tomatoes, and seasoned grilled chicken.",
        price: "15.49",
        category: "Pasta",
        calories: 680,
        proteinG: "48.0",
        carbsG: "62.0",
        fatG: "24.0",
        fiberG: "9.0",
        isAvailable: true,
        photoUrl: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=400&auto=format&fit=crop",
      },
    ]).onConflictDoNothing();

    // 4. Seed Meal Logs for Today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await db.insert(mealLogs).values([
      {
        id: "log-1",
        userId: "demo-user-id",
        mealName: "Protein Oatmeal with Berries",
        calories: 380,
        proteinG: "25.0",
        carbsG: "48.0",
        fatG: "8.0",
        fiberG: "7.0",
        portionMultiplier: "1.0",
        mealType: "BREAKFAST",
        source: "MANUAL",
        loggedAt: today,
      },
      {
        id: "log-2",
        userId: "demo-user-id",
        mealName: "Spicy Chicken & Quinoa Bowl",
        calories: 620,
        proteinG: "45.0",
        carbsG: "55.0",
        fatG: "18.0",
        fiberG: "8.0",
        portionMultiplier: "1.0",
        mealType: "LUNCH",
        source: "MENU_ITEM",
        loggedAt: today,
      },
      {
        id: "log-3",
        userId: "demo-user-id",
        mealName: "Double Chocolate Whey Shake",
        calories: 450,
        proteinG: "32.0",
        carbsG: "42.0",
        fatG: "14.0",
        fiberG: "6.0",
        portionMultiplier: "1.0",
        mealType: "SNACK",
        source: "MENU_ITEM",
        loggedAt: today,
      },
    ]).onConflictDoNothing();

    console.log("Database seeded successfully.");
  } catch (error) {
    console.error("Database seeding failed:", error);
  }
}

// -----------------------------------------------------------------------------
// USER API ROUTES
// -----------------------------------------------------------------------------

// Get current user profile or register new user
app.get("/api/users/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const email = req.user!.email || `${uid}@delish.com`;
    const name = req.user!.name || "Delish User";

    const userRecord = await getOrCreateUser(uid, email, name);
    res.json(userRecord);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update user goals during onboarding
app.post("/api/users/onboard", requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const { name, goalCalories, goalProteinG, goalCarbsG, goalFatG, role } = req.body;

    const result = await db
      .update(users)
      .set({
        name,
        goalCalories: Number(goalCalories),
        goalProteinG: Number(goalProteinG),
        goalCarbsG: Number(goalCarbsG),
        goalFatG: Number(goalFatG),
        role: role || "USER",
      })
      .where(eq(users.id, uid))
      .returning();

    res.json(result[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// -----------------------------------------------------------------------------
// MEAL LOGS API ROUTES
// -----------------------------------------------------------------------------

// Get all meal logs for a specific date
app.get("/api/meal-logs", requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const { date } = req.query; // YYYY-MM-DD
    if (!date) {
      return res.status(400).json({ error: "Missing date query parameter" });
    }

    const startOfDay = new Date(date as string);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date as string);
    endOfDay.setHours(23, 59, 59, 999);

    const logs = await db
      .select()
      .from(mealLogs)
      .where(
        and(
          eq(mealLogs.userId, uid),
          and(
            eq(mealLogs.userId, uid) // double validation
          )
        )
      );

    // Filter programmatically to handle different timezone complexities on cloud databases
    const filteredLogs = logs.filter((log) => {
      const logDateStr = new Date(log.loggedAt).toISOString().split("T")[0];
      return logDateStr === date;
    });

    // Helper to map DB Decimal string types to client-friendly numbers
    const mappedLogs = filteredLogs.map((log) => ({
      ...log,
      calories: Number(log.calories),
      proteinG: parseFloat(log.proteinG),
      carbsG: parseFloat(log.carbsG),
      fatG: parseFloat(log.fatG),
      fiberG: parseFloat(log.fiberG),
      portionMultiplier: parseFloat(log.portionMultiplier),
    }));

    res.json(mappedLogs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add new meal log
app.post("/api/meal-logs", requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const {
      mealName,
      calories,
      proteinG,
      carbsG,
      fatG,
      fiberG,
      portionMultiplier,
      mealType,
      source,
      date,
    } = req.body;

    const logDate = date ? new Date(date) : new Date();

    const result = await db
      .insert(mealLogs)
      .values({
        id: generateUUID(),
        userId: uid,
        mealName,
        calories: Number(calories),
        proteinG: String(proteinG),
        carbsG: String(carbsG),
        fatG: String(fatG),
        fiberG: String(fiberG),
        portionMultiplier: String(portionMultiplier || 1.0),
        mealType: mealType || "BREAKFAST",
        source: source || "MANUAL",
        loggedAt: logDate,
      })
      .returning();

    res.json(result[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a meal log
app.delete("/api/meal-logs/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const { id } = req.params;

    const result = await db
      .delete(mealLogs)
      .where(and(eq(mealLogs.id, id), eq(mealLogs.userId, uid)))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: "Meal log not found or unauthorized" });
    }

    res.json({ success: true, deleted: result[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get historical meal summary for past 7 days (trend line chart)
app.get("/api/meal-logs/trends", requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const allLogs = await db
      .select()
      .from(mealLogs)
      .where(eq(mealLogs.userId, uid));

    // Group logs by past 7 days
    const trendMap: { [key: string]: { calories: number; protein: number; carbs: number; fat: number; fiber: number } } = {};

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split("T")[0];
      trendMap[dateKey] = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
    }

    allLogs.forEach((log) => {
      const dateKey = new Date(log.loggedAt).toISOString().split("T")[0];
      if (trendMap[dateKey]) {
        const mult = parseFloat(log.portionMultiplier) || 1.0;
        trendMap[dateKey].calories += Math.round(Number(log.calories) * mult);
        trendMap[dateKey].protein += parseFloat(log.proteinG) * mult;
        trendMap[dateKey].carbs += parseFloat(log.carbsG) * mult;
        trendMap[dateKey].fat += parseFloat(log.fatG) * mult;
        trendMap[dateKey].fiber += parseFloat(log.fiberG) * mult;
      }
    });

    const trends = Object.entries(trendMap).map(([date, data]) => ({
      date,
      calories: data.calories,
      protein: Math.round(data.protein * 10) / 10,
      carbs: Math.round(data.carbs * 10) / 10,
      fat: Math.round(data.fat * 10) / 10,
      fiber: Math.round(data.fiber * 10) / 10,
    }));

    res.json(trends);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// -----------------------------------------------------------------------------
// RESTAURANTS & ORDERS PUBLIC API ROUTES
// -----------------------------------------------------------------------------

// List all active restaurants
app.get("/api/restaurants", requireAuth, async (req: AuthRequest, res) => {
  try {
    const list = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.isActive, true));
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get restaurant details and menu items
app.get("/api/restaurants/:id/menu", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const r = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.id, id))
      .limit(1);

    if (r.length === 0) {
      return res.status(404).json({ error: "Restaurant not found" });
    }

    const items = await db
      .select()
      .from(menuItems)
      .where(and(eq(menuItems.restaurantId, id), eq(menuItems.isAvailable, true)));

    // Map DB numeric types to client floats
    const mappedItems = items.map((item) => ({
      ...item,
      price: parseFloat(item.price),
      calories: Number(item.calories),
      proteinG: parseFloat(item.proteinG),
      carbsG: parseFloat(item.carbsG),
      fatG: parseFloat(item.fatG),
      fiberG: parseFloat(item.fiberG),
    }));

    res.json({
      restaurant: r[0],
      menuItems: mappedItems,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Place order
app.post("/api/orders", requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const { restaurantId, items, deliveryAddress } = req.body; // items: [{ menuItemId, quantity }]

    if (!restaurantId || !items || items.length === 0 || !deliveryAddress) {
      return res.status(400).json({ error: "Missing required order fields" });
    }

    // Retrieve all ordered items to compute pricing
    const itemIds = items.map((i: any) => i.menuItemId);
    const dbItems = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.restaurantId, restaurantId));

    const itemPriceMap = new Map();
    dbItems.forEach((item) => {
      itemPriceMap.set(item.id, parseFloat(item.price));
    });

    let total = 0;
    const orderItemsToInsert: any[] = [];
    const orderId = generateUUID();

    for (const item of items) {
      const price = itemPriceMap.get(item.menuItemId);
      if (!price) {
        return res.status(400).json({ error: `Menu item ${item.menuItemId} is not in this restaurant's menu` });
      }
      const itemTotal = price * Number(item.quantity);
      total += itemTotal;

      orderItemsToInsert.push({
        id: generateUUID(),
        orderId,
        menuItemId: item.menuItemId,
        quantity: Number(item.quantity),
        unitPrice: String(price),
      });
    }

    // Insert order header
    await db.insert(orders).values({
      id: orderId,
      userId: uid,
      restaurantId,
      status: "PLACED",
      totalPrice: String(total),
      deliveryAddress,
    });

    // Insert order items
    await db.insert(orderItems).values(orderItemsToInsert);

    res.json({ id: orderId, status: "PLACED", totalPrice: total });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get user orders (all orders placed by current user)
app.get("/api/orders/mine", requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const list = await db
      .select({
        id: orders.id,
        status: orders.status,
        totalPrice: orders.totalPrice,
        createdAt: orders.createdAt,
        restaurantName: restaurants.name,
      })
      .from(orders)
      .innerJoin(restaurants, eq(orders.restaurantId, restaurants.id))
      .where(eq(orders.userId, uid))
      .orderBy(desc(orders.createdAt));

    const mapped = list.map((o) => ({
      ...o,
      totalPrice: parseFloat(o.totalPrice),
    }));

    res.json(mapped);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get order details + status + tracking
app.get("/api/orders/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const ord = await db
      .select({
        id: orders.id,
        status: orders.status,
        totalPrice: orders.totalPrice,
        createdAt: orders.createdAt,
        deliveryAddress: orders.deliveryAddress,
        restaurantName: restaurants.name,
      })
      .from(orders)
      .innerJoin(restaurants, eq(orders.restaurantId, restaurants.id))
      .where(eq(orders.id, id))
      .limit(1);

    if (ord.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    const items = await db
      .select({
        id: orderItems.id,
        quantity: orderItems.quantity,
        unitPrice: orderItems.unitPrice,
        itemName: menuItems.name,
        calories: menuItems.calories,
        proteinG: menuItems.proteinG,
        carbsG: menuItems.carbsG,
        fatG: menuItems.fatG,
        fiberG: menuItems.fiberG,
      })
      .from(orderItems)
      .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
      .where(eq(orderItems.orderId, id));

    const mappedItems = items.map((i) => ({
      ...i,
      unitPrice: parseFloat(i.unitPrice),
      proteinG: parseFloat(i.proteinG),
      carbsG: parseFloat(i.carbsG),
      fatG: parseFloat(i.fatG),
      fiberG: parseFloat(i.fiberG),
    }));

    res.json({
      order: {
        ...ord[0],
        totalPrice: parseFloat(ord[0].totalPrice),
      },
      items: mappedItems,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Log order macros directly to diary
app.post("/api/orders/:id/log-macros", requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const { id } = req.params;
    const { mealType } = req.body;

    const ord = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.userId, uid)))
      .limit(1);

    if (ord.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    const items = await db
      .select({
        quantity: orderItems.quantity,
        name: menuItems.name,
        calories: menuItems.calories,
        proteinG: menuItems.proteinG,
        carbsG: menuItems.carbsG,
        fatG: menuItems.fatG,
        fiberG: menuItems.fiberG,
      })
      .from(orderItems)
      .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
      .where(eq(orderItems.orderId, id));

    const logsInserted = [];
    for (const item of items) {
      const q = Number(item.quantity);
      const mult = q.toFixed(1);

      const log = await db
        .insert(mealLogs)
        .values({
          id: generateUUID(),
          userId: uid,
          mealName: `${item.name} (${q}x)`,
          calories: Math.round(Number(item.calories) * q),
          proteinG: String(parseFloat(item.proteinG) * q),
          carbsG: String(parseFloat(item.carbsG) * q),
          fatG: String(parseFloat(item.fatG) * q),
          fiberG: String(parseFloat(item.fiberG) * q),
          portionMultiplier: "1.0",
          mealType: mealType || "LUNCH",
          source: "MENU_ITEM",
          loggedAt: new Date(),
        })
        .returning();

      logsInserted.push(log[0]);
    }

    res.json({ success: true, logs: logsInserted });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// -----------------------------------------------------------------------------
// RESTAURANT OWNER PORTAL ROUTES
// -----------------------------------------------------------------------------

// Helper middleware to check restaurant owner role
const requireOwner = async (req: AuthRequest, res: any, next: any) => {
  try {
    const uid = req.user!.uid;
    const userRec = await db
      .select()
      .from(users)
      .where(eq(users.id, uid))
      .limit(1);

    if (userRec.length === 0 || userRec[0].role !== "RESTAURANT_OWNER") {
      return res.status(403).json({ error: "Access Denied: Restaurant Owners only" });
    }
    next();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Create or update restaurant profile for the owner
app.post("/api/restaurant", requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const { name, address, cuisineType } = req.body;

    // Check if the user already has a restaurant
    const existing = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.ownerUserId, uid))
      .limit(1);

    let profile;
    const rId = existing.length > 0 ? existing[0].id : generateUUID();

    if (existing.length > 0) {
      const result = await db
        .update(restaurants)
        .set({ name, address, cuisineType, isActive: true })
        .where(eq(restaurants.id, rId))
        .returning();
      profile = result[0];
    } else {
      const result = await db
        .insert(restaurants)
        .values({
          id: rId,
          ownerUserId: uid,
          name,
          address,
          cuisineType,
          isActive: true,
        })
        .returning();
      profile = result[0];
    }

    // Auto promote to RESTAURANT_OWNER role if not already
    await db
      .update(users)
      .set({ role: "RESTAURANT_OWNER" })
      .where(eq(users.id, uid));

    res.json(profile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get the owner's restaurant profile
app.get("/api/restaurant/profile", requireAuth, requireOwner, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const r = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.ownerUserId, uid))
      .limit(1);

    if (r.length === 0) {
      return res.status(404).json({ error: "No restaurant found for this owner" });
    }

    res.json(r[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all menu items for owner's restaurant
app.get("/api/restaurant/menu-items", requireAuth, requireOwner, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const r = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.ownerUserId, uid))
      .limit(1);

    if (r.length === 0) {
      return res.json([]);
    }

    const items = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.restaurantId, r[0].id));

    const mapped = items.map((i) => ({
      ...i,
      price: parseFloat(i.price),
      calories: Number(i.calories),
      proteinG: parseFloat(i.proteinG),
      carbsG: parseFloat(i.carbsG),
      fatG: parseFloat(i.fatG),
      fiberG: parseFloat(i.fiberG),
    }));

    res.json(mapped);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add new menu item
app.post("/api/restaurant/menu-items", requireAuth, requireOwner, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const { name, description, price, category, calories, proteinG, carbsG, fatG, fiberG, photoUrl } = req.body;

    const r = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.ownerUserId, uid))
      .limit(1);

    if (r.length === 0) {
      return res.status(404).json({ error: "Restaurant profile not found. Set one up first." });
    }

    const newItemId = generateUUID();
    const result = await db
      .insert(menuItems)
      .values({
        id: newItemId,
        restaurantId: r[0].id,
        name,
        description,
        price: String(price),
        category,
        calories: Number(calories || 0),
        proteinG: String(proteinG || 0.0),
        carbsG: String(carbsG || 0.0),
        fatG: String(fatG || 0.0),
        fiberG: String(fiberG || 0.0),
        isAvailable: true,
        photoUrl: photoUrl || null,
      })
      .returning();

    res.json(result[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Edit menu item
app.patch("/api/restaurant/menu-items/:id", requireAuth, requireOwner, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const { id } = req.params;
    const { name, description, price, category, calories, proteinG, carbsG, fatG, fiberG, photoUrl, isAvailable } = req.body;

    const r = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.ownerUserId, uid))
      .limit(1);

    if (r.length === 0) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const result = await db
      .update(menuItems)
      .set({
        name,
        description,
        price: price ? String(price) : undefined,
        category,
        calories: calories !== undefined ? Number(calories) : undefined,
        proteinG: proteinG !== undefined ? String(proteinG) : undefined,
        carbsG: carbsG !== undefined ? String(carbsG) : undefined,
        fatG: fatG !== undefined ? String(fatG) : undefined,
        fiberG: fiberG !== undefined ? String(fiberG) : undefined,
        photoUrl,
        isAvailable,
      })
      .where(and(eq(menuItems.id, id), eq(menuItems.restaurantId, r[0].id)))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: "Menu item not found" });
    }

    res.json(result[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete menu item
app.delete("/api/restaurant/menu-items/:id", requireAuth, requireOwner, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const { id } = req.params;

    const r = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.ownerUserId, uid))
      .limit(1);

    if (r.length === 0) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const result = await db
      .delete(menuItems)
      .where(and(eq(menuItems.id, id), eq(menuItems.restaurantId, r[0].id)))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: "Menu item not found" });
    }

    res.json({ success: true, deleted: result[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Live order list for owner's restaurant
app.get("/api/restaurant/orders", requireAuth, requireOwner, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const r = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.ownerUserId, uid))
      .limit(1);

    if (r.length === 0) {
      return res.json([]);
    }

    const list = await db
      .select({
        id: orders.id,
        status: orders.status,
        totalPrice: orders.totalPrice,
        createdAt: orders.createdAt,
        deliveryAddress: orders.deliveryAddress,
        userName: users.name,
      })
      .from(orders)
      .innerJoin(users, eq(orders.userId, users.id))
      .where(eq(orders.restaurantId, r[0].id))
      .orderBy(desc(orders.createdAt));

    const enrichedList = [];
    for (const ord of list) {
      const items = await db
        .select({
          quantity: orderItems.quantity,
          unitPrice: orderItems.unitPrice,
          name: menuItems.name,
        })
        .from(orderItems)
        .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
        .where(eq(orderItems.orderId, ord.id));

      enrichedList.push({
        ...ord,
        totalPrice: parseFloat(ord.totalPrice),
        items: items.map((i) => ({
          ...i,
          unitPrice: parseFloat(i.unitPrice),
        })),
      });
    }

    res.json(enrichedList);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update order status
app.patch("/api/restaurant/orders/:id/status", requireAuth, requireOwner, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const { id } = req.params;
    const { status } = req.body;

    const r = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.ownerUserId, uid))
      .limit(1);

    if (r.length === 0) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const result = await db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(orders.id, id), eq(orders.restaurantId, r[0].id)))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json(result[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// -----------------------------------------------------------------------------
// AI RECIPE ANALYZER AND AI MACROS FOR MENU ITEM
// -----------------------------------------------------------------------------

// POST /api/analyze-recipe
app.post("/api/analyze-recipe", requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const { url, text } = req.body;

    if (!url && !text) {
      return res.status(400).json({ error: "Missing url or text in request body" });
    }

    let recipeText = text || "";

    if (url) {
      try {
        const fetchRes = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          },
        });
        if (!fetchRes.ok) {
          throw new Error(`HTTP Error ${fetchRes.status}`);
        }
        const html = await fetchRes.text();
        const $ = cheerio.load(html);

        // Remove scripts, styles, and other metadata
        $("script, style, nav, footer, header, noscript, iframe, link, svg").remove();
        recipeText = $("body").text().replace(/\s+/g, " ").trim().substring(0, 5000);
      } catch (scrapeErr) {
        console.error("URL scraping failed:", scrapeErr);
        return res.status(422).json({
          error: "Couldn't read that page — try pasting the recipe text directly.",
        });
      }
    }

    if (!recipeText || recipeText.trim().length < 10) {
      return res.status(400).json({ error: "Recipe content is too short to analyze." });
    }

    const prompt = `You are a nutritionist AI. Analyze the recipe below and return ONLY a valid JSON object with no markdown, no explanation, no backticks. Just raw JSON.

{
  "dish_name": "string",
  "servings": number,
  "per_serving": {
    "calories": number,
    "protein_g": number,
    "carbs_g": number,
    "fat_g": number,
    "fiber_g": number
  }
}

If you cannot determine a value, use your best nutritional estimate. Always return valid numbers, never null.

Recipe:
${recipeText}`;

    let parsedResult;
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const responseText = response.text || "{}";
      parsedResult = JSON.parse(responseText);
    } catch (parseError) {
      console.warn("First prompt parsing failed, retrying once with stricter constraint...", parseError);
      try {
        // Retry with a simpler prompt and ensure correct parsing
        const retryPrompt = `Return ONLY raw JSON with keys: dish_name, servings, per_serving (with calories, protein_g, carbs_g, fat_g, fiber_g) for: ${recipeText.substring(0, 1000)}`;
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: retryPrompt,
          config: {
            responseMimeType: "application/json",
          },
        });
        parsedResult = JSON.parse(response.text || "{}");
      } catch (secondErr) {
        console.error("AI parse failed completely:", secondErr);
        return res.status(422).json({
          error: "AI couldn't extract macros. You can enter them manually.",
        });
      }
    }

    const analysisId = generateUUID();
    const resultToInsert = {
      id: analysisId,
      userId: uid,
      sourceUrl: url || null,
      dishName: parsedResult.dish_name || "Analyzed Dish",
      perServingCalories: Number(parsedResult.per_serving?.calories || 0),
      perServingProteinG: String(parsedResult.per_serving?.protein_g || 0),
      perServingCarbsG: String(parsedResult.per_serving?.carbs_g || 0),
      perServingFatG: String(parsedResult.per_serving?.fat_g || 0),
      perServingFiberG: String(parsedResult.per_serving?.fiber_g || 0),
    };

    // Save to recipeAnalyses table
    await db.insert(recipeAnalyses).values(resultToInsert);

    // Return mapped version to client with float conversions
    res.json({
      id: analysisId,
      dishName: resultToInsert.dishName,
      servings: Number(parsedResult.servings || 1),
      per_serving: {
        calories: resultToInsert.perServingCalories,
        protein_g: parseFloat(resultToInsert.perServingProteinG),
        carbs_g: parseFloat(resultToInsert.perServingCarbsG),
        fat_g: parseFloat(resultToInsert.perServingFatG),
        fiber_g: parseFloat(resultToInsert.perServingFiberG),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/menu-items/ai-macros
app.post("/api/menu-items/ai-macros", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Missing name in request body" });
    }

    const prompt = `Return ONLY JSON with calories, protein_g, carbs_g, fat_g, fiber_g for a single serving of: ${name} — ${description || ""}. No explanation or backticks.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json({
      calories: Number(parsed.calories || 0),
      protein_g: Number(parsed.protein_g || 0),
      carbs_g: Number(parsed.carbs_g || 0),
      fat_g: Number(parsed.fat_g || 0),
      fiber_g: Number(parsed.fiber_g || 0),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// -----------------------------------------------------------------------------
// VITE DEV SERVER / STATIC PRODUCTION SERVING
// -----------------------------------------------------------------------------
async function start() {
  await seedDatabase();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start();
