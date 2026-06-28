export interface User {
  id: string;
  name: string;
  email: string;
  goalCalories: number;
  goalProteinG: number;
  goalCarbsG: number;
  goalFatG: number;
  role: "USER" | "RESTAURANT_OWNER";
  createdAt: string;
}

export interface MealLog {
  id: string;
  userId: string;
  mealName: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  portionMultiplier: number;
  mealType: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";
  source: "AI_RECIPE" | "MANUAL" | "MENU_ITEM";
  loggedAt: string;
}

export interface Restaurant {
  id: string;
  ownerUserId: string;
  name: string;
  address: string;
  cuisineType: string;
  isActive: boolean;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  price: number;
  category: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  isAvailable: boolean;
  photoUrl: string | null;
}

export interface Order {
  id: string;
  userId: string;
  restaurantId: string;
  status: "PLACED" | "ACCEPTED" | "PREPARING" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED";
  totalPrice: number;
  deliveryAddress: string;
  createdAt: string;
  updatedAt: string;
  restaurantName?: string;
  userName?: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  quantity: number;
  unitPrice: number;
  itemName: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
}

export interface RecipeAnalysis {
  id: string;
  dishName: string;
  servings: number;
  per_serving: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
  };
}

export interface TrendData {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}
