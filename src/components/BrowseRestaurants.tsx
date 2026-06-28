import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.tsx";
import { Restaurant, MenuItem, Order } from "../types.ts";
import { motion } from "motion/react";
import {
  Utensils,
  MapPin,
  Plus,
  Minus,
  ShoppingCart,
  CheckCircle,
  Truck,
  ArrowLeft,
  Search,
  Check,
  Zap,
} from "lucide-react";

interface BrowseRestaurantsProps {
  onBackToDashboard: () => void;
}

export const BrowseRestaurants: React.FC<BrowseRestaurantsProps> = ({ onBackToDashboard }) => {
  const { apiFetch, user } = useAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cuisineFilter, setCuisineFilter] = useState<string>("All");

  // Cart State (stored per active restaurant)
  const [cart, setCart] = useState<{ item: MenuItem; quantity: number }[]>([]);
  const [address, setAddress] = useState(user?.name ? `${user.name}'s Gym, 456 Fit Way` : "456 Fit Way");
  const [placingOrder, setPlacingOrder] = useState(false);

  // Active Order Tracking State
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [activeOrderItems, setActiveOrderItems] = useState<any[]>([]);
  const [orderStatusInterval, setOrderStatusInterval] = useState<number | null>(null);
  const [macroLogged, setMacroLogged] = useState(false);

  // Load active restaurants
  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/restaurants");
      if (res.ok) {
        const data = await res.json();
        setRestaurants(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch restaurant menu when selected
  const handleSelectRestaurant = async (rest: Restaurant) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/restaurants/${rest.id}/menu`);
      if (res.ok) {
        const data = await res.json();
        setSelectedRestaurant(data.restaurant);
        setMenuItems(data.menuItems);
        setCart([]); // Clear cart for new restaurant
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.item.id === item.id);
      if (existing) {
        return prev.map((i) => (i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const handleUpdateCartQuantity = (itemId: string, diff: number) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.item.id === itemId);
      if (!existing) return prev;
      const newQty = existing.quantity + diff;
      if (newQty <= 0) {
        return prev.filter((i) => i.item.id !== itemId);
      }
      return prev.map((i) => (i.item.id === itemId ? { ...i, quantity: newQty } : i));
    });
  };

  const calculateCartTotal = () => {
    return cart.reduce((sum, item) => sum + item.item.price * item.quantity, 0);
  };

  const calculateCartMacros = () => {
    return cart.reduce(
      (totals, cartItem) => {
        const qty = cartItem.quantity;
        return {
          calories: totals.calories + cartItem.item.calories * qty,
          protein: totals.protein + cartItem.item.proteinG * qty,
          carbs: totals.carbs + cartItem.item.carbsG * qty,
          fat: totals.fat + cartItem.item.fatG * qty,
          fiber: totals.fiber + cartItem.item.fiberG * qty,
        };
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
    );
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0 || !address.trim() || !selectedRestaurant) return;
    setPlacingOrder(true);

    try {
      const orderData = {
        restaurantId: selectedRestaurant.id,
        items: cart.map((i) => ({
          menuItemId: i.item.id,
          quantity: i.quantity,
        })),
        deliveryAddress: address,
      };

      const res = await apiFetch("/api/orders", {
        method: "POST",
        body: JSON.stringify(orderData),
      });

      if (res.ok) {
        const placed = await res.json();
        // Move instantly to tracking screen
        fetchOrderDetails(placed.id);
        setCart([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPlacingOrder(false);
    }
  };

  const fetchOrderDetails = async (orderId: string) => {
    try {
      const res = await apiFetch(`/api/orders/${orderId}`);
      if (res.ok) {
        const data = await res.json();
        setActiveOrder(data.order);
        setActiveOrderItems(data.items);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Setup live order polling status simulation
  useEffect(() => {
    if (!activeOrder) return;

    const interval = setInterval(async () => {
      // Simulate/Check actual order status
      try {
        const res = await apiFetch(`/api/orders/${activeOrder.id}`);
        if (res.ok) {
          const data = await res.json();
          setActiveOrder(data.order);

          // Simulate automatic status advancement for demo orders
          if (activeOrder.id.startsWith("demo-") || activeOrder.status !== "DELIVERED") {
            const statuses = ["PLACED", "ACCEPTED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"];
            const currIdx = statuses.indexOf(data.order.status);
            if (currIdx !== -1 && currIdx < statuses.length - 1) {
              const nextStatus = statuses[currIdx + 1];
              // Call status updater endpoint
              await apiFetch(`/api/restaurant/orders/${activeOrder.id}/status`, {
                method: "PATCH",
                body: JSON.stringify({ status: nextStatus }),
              });
            }
          }
        }
      } catch (e) {
        console.error(e);
      }
    }, 10000); // Check/Advance every 10 seconds for smooth simulation feedback

    return () => clearInterval(interval);
  }, [activeOrder]);

  const handleLogOrderMacros = async (mealType: string) => {
    if (!activeOrder) return;
    try {
      const res = await apiFetch(`/api/orders/${activeOrder.id}/log-macros`, {
        method: "POST",
        body: JSON.stringify({ mealType }),
      });
      if (res.ok) {
        setMacroLogged(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Get list of cuisines
  const cuisines = ["All", ...Array.from(new Set(restaurants.map((r) => r.cuisineType)))];

  const filteredRestaurants =
    cuisineFilter === "All"
      ? restaurants
      : restaurants.filter((r) => r.cuisineType === cuisineFilter);

  // Group menu items by category
  const categories = Array.from(new Set(menuItems.map((item) => item.category)));

  // If order tracking screen is active
  if (activeOrder) {
    const statuses = ["PLACED", "ACCEPTED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"];
    const currentStatusIdx = statuses.indexOf(activeOrder.status);

    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        <button
          onClick={() => {
            setActiveOrder(null);
            setMacroLogged(false);
            setSelectedRestaurant(null);
          }}
          className="flex items-center text-gray-500 hover:text-[#F26419] font-bold text-sm cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Restaurants
        </button>

        <div className="bg-white rounded-2xl p-6 shadow-xl border border-orange-500/10 space-y-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center border-b border-gray-100 pb-4">
            <div>
              <p className="text-[10px] font-mono text-[#F26419] font-bold tracking-wider uppercase">
                ORDER ID: {activeOrder.id}
              </p>
              <h3 className="font-extrabold text-2xl text-[#1A1A1A] tracking-tight">
                {activeOrder.restaurantName}
              </h3>
            </div>
            <div className="mt-2 md:mt-0 bg-[#FFF8F2] border border-[#F26419]/20 px-4 py-2 rounded-xl text-center">
              <p className="text-xs text-gray-400 font-semibold uppercase">Total Paid</p>
              <p className="text-lg font-black text-[#F26419]">${activeOrder.totalPrice.toFixed(2)}</p>
            </div>
          </div>

          {/* Status Step Indicators */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4">
              Real-time Delivery Tracking
            </p>
            <div className="grid grid-cols-5 gap-1.5 relative">
              {statuses.map((s, idx) => {
                const isActive = idx <= currentStatusIdx;
                const isCurrent = idx === currentStatusIdx;
                return (
                  <div key={s} className="text-center flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center border font-bold text-xs transition-all ${
                        isCurrent
                          ? "bg-[#F26419] text-white border-[#F26419] scale-110 shadow-md shadow-[#F26419]/20"
                          : isActive
                          ? "bg-[#52B788] text-white border-[#52B788]"
                          : "bg-gray-50 text-gray-400 border-gray-200"
                      }`}
                    >
                      {s === "DELIVERED" ? <CheckCircle className="w-4 h-4" /> : idx + 1}
                    </div>
                    <p
                      className={`text-[9px] font-bold mt-1.5 uppercase tracking-wide ${
                        isCurrent ? "text-[#F26419]" : isActive ? "text-[#52B788]" : "text-gray-400"
                      }`}
                    >
                      {s === "OUT_FOR_DELIVERY" ? "OUT" : s}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Macro Diary Prompt if DELIVERED */}
          {activeOrder.status === "DELIVERED" && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-[#52B788]/5 border border-[#52B788]/20 rounded-xl p-5 text-center space-y-3"
            >
              <Check className="w-8 h-8 bg-[#52B788] text-white rounded-full p-1.5 mx-auto animate-bounce" />
              <div>
                <h4 className="font-extrabold text-[#1A1A1A] text-lg">Your Food has Arrived!</h4>
                <p className="text-gray-500 text-xs">
                  Would you like to instantly log the complete nutritional macros of this order to your daily diary?
                </p>
              </div>

              {!macroLogged ? (
                <div className="flex justify-center space-x-2">
                  {(["LUNCH", "DINNER", "BREAKFAST", "SNACK"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => handleLogOrderMacros(t)}
                      className="px-4 py-1.5 bg-[#52B788] hover:bg-[#52B788]/90 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                    >
                      Log as {t}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[#52B788] font-bold text-sm flex items-center justify-center">
                  <Check className="w-4 h-4 mr-1" /> Macros successfully logged to your diary!
                </p>
              )}
            </motion.div>
          )}

          {/* Order Details Items */}
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Ordered Items & Macros</p>
            <div className="divide-y divide-gray-50 bg-gray-50/50 rounded-xl p-3 border border-gray-100">
              {activeOrderItems.map((item, idx) => (
                <div key={idx} className="py-2.5 flex justify-between items-center text-sm">
                  <div>
                    <p className="font-bold text-[#1A1A1A]">
                      {item.itemName} <span className="text-[#F26419]">x{item.quantity}</span>
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px]">
                        {item.calories} kcal
                      </span>
                      <span className="bg-red-50 text-red-600 px-1.5 py-0.5 rounded text-[10px]">
                        P: {item.proteinG}g
                      </span>
                      <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[10px]">
                        C: {item.carbsG}g
                      </span>
                      <span className="bg-yellow-50 text-yellow-600 px-1.5 py-0.5 rounded text-[10px]">
                        F: {item.fatG}g
                      </span>
                    </div>
                  </div>
                  <p className="font-bold text-[#1A1A1A]">${(item.unitPrice * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center font-bold px-3 pt-2 text-sm">
              <span className="text-gray-500">Delivery Address</span>
              <span className="text-[#1A1A1A] text-right max-w-xs">{activeOrder.deliveryAddress}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If viewing active menu
  if (selectedRestaurant) {
    const cartMacros = calculateCartMacros();
    const cartTotal = calculateCartTotal();

    return (
      <div className="max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Menu Section */}
        <div className="lg:col-span-2 space-y-6">
          <button
            onClick={() => setSelectedRestaurant(null)}
            className="flex items-center text-gray-500 hover:text-[#F26419] font-bold text-sm cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Restaurants
          </button>

          <div className="bg-white rounded-2xl p-6 shadow-md border border-orange-500/5">
            <h3 className="font-extrabold text-2xl text-[#1A1A1A] tracking-tight">
              {selectedRestaurant.name}
            </h3>
            <p className="text-xs text-[#6B6B6B] flex items-center mt-1">
              <MapPin className="w-3.5 h-3.5 text-[#F26419] mr-1" />
              {selectedRestaurant.address} • Cuisine: {selectedRestaurant.cuisineType}
            </p>
          </div>

          {categories.map((cat) => (
            <div key={cat} className="space-y-3">
              <h4 className="font-black text-lg text-gray-800 border-b border-gray-100 pb-1.5 capitalize">
                {cat}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {menuItems
                  .filter((item) => item.category === cat)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div>
                        {item.photoUrl && (
                          <img
                            src={item.photoUrl}
                            alt={item.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-32 object-cover"
                          />
                        )}
                        <div className="p-4 space-y-1.5">
                          <h5 className="font-bold text-[#1A1A1A] text-sm leading-tight">
                            {item.name}
                          </h5>
                          <p className="text-xs text-gray-400 line-clamp-2">
                            {item.description}
                          </p>

                          {/* Nutrition Tags */}
                          <div className="flex flex-wrap gap-1 mt-1">
                            <span className="bg-orange-50 text-[#F26419] text-[9px] font-bold px-1.5 py-0.5 rounded">
                              {item.calories} kcal
                            </span>
                            <span className="bg-red-50 text-red-600 text-[9px] font-bold px-1.5 py-0.5 rounded">
                              P: {item.proteinG}g
                            </span>
                            <span className="bg-blue-50 text-blue-600 text-[9px] font-bold px-1.5 py-0.5 rounded">
                              C: {item.carbsG}g
                            </span>
                            <span className="bg-yellow-50 text-yellow-500 text-[9px] font-bold px-1.5 py-0.5 rounded">
                              F: {item.fatG}g
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="px-4 pb-4 pt-1.5 flex justify-between items-center border-t border-gray-50 mt-1">
                        <span className="font-extrabold text-sm text-[#F26419]">
                          ${item.price.toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAddToCart(item)}
                          className="px-3 py-1 bg-[#F26419]/10 text-[#F26419] hover:bg-[#F26419] hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add to Cart</span>
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Cart & Run Macro Totals */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 shadow-xl border border-orange-500/10 sticky top-4 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h4 className="font-extrabold text-[#1A1A1A] flex items-center">
                <ShoppingCart className="w-4 h-4 text-[#F26419] mr-1.5" />
                Active Cart
              </h4>
              <span className="bg-orange-50 text-[#F26419] px-2 py-0.5 rounded-full text-[10px] font-bold">
                {cart.reduce((sum, i) => sum + i.quantity, 0)} items
              </span>
            </div>

            {cart.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <Utensils className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">Your cart is empty.</p>
                <p className="text-[10px] mt-0.5">Select items to populate order.</p>
              </div>
            ) : (
              <>
                {/* Cart list */}
                <div className="divide-y divide-gray-50 max-h-48 overflow-y-auto space-y-2">
                  {cart.map((cartItem) => (
                    <div key={cartItem.item.id} className="py-2.5 flex justify-between items-center">
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="font-bold text-xs text-[#1A1A1A] truncate">
                          {cartItem.item.name}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          ${cartItem.item.price.toFixed(2)} each
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleUpdateCartQuantity(cartItem.item.id, -1)}
                          className="w-5 h-5 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 font-bold cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold text-gray-800 w-4 text-center">
                          {cartItem.quantity}
                        </span>
                        <button
                          onClick={() => handleUpdateCartQuantity(cartItem.item.id, 1)}
                          className="w-5 h-5 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 font-bold cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Running Macro Total Panel */}
                <div className="bg-[#FFF8F2] rounded-xl p-3 border border-orange-500/5 space-y-2">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide flex items-center">
                    <Zap className="w-3.5 h-3.5 text-[#F26419] mr-1" />
                    Running Cart Macros:
                  </p>
                  <div className="grid grid-cols-5 gap-1.5 text-center text-xs">
                    <div className="bg-white p-1 rounded">
                      <p className="font-black text-[10px]">{cartMacros.calories}</p>
                      <p className="text-[8px] text-gray-400">Cal</p>
                    </div>
                    <div className="bg-white p-1 rounded border-b border-red-500">
                      <p className="font-black text-red-600 text-[10px]">
                        {cartMacros.protein.toFixed(0)}g
                      </p>
                      <p className="text-[8px] text-gray-400">Prot</p>
                    </div>
                    <div className="bg-white p-1 rounded border-b border-blue-500">
                      <p className="font-black text-blue-600 text-[10px]">
                        {cartMacros.carbs.toFixed(0)}g
                      </p>
                      <p className="text-[8px] text-gray-400">Carb</p>
                    </div>
                    <div className="bg-white p-1 rounded border-b border-yellow-500">
                      <p className="font-black text-yellow-600 text-[10px]">
                        {cartMacros.fat.toFixed(0)}g
                      </p>
                      <p className="text-[8px] text-gray-400">Fat</p>
                    </div>
                    <div className="bg-white p-1 rounded border-b border-[#52B788]">
                      <p className="font-black text-[#52B788] text-[10px]">
                        {cartMacros.fiber.toFixed(0)}g
                      </p>
                      <p className="text-[8px] text-gray-400">Fib</p>
                    </div>
                  </div>
                </div>

                {/* Address Input */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                    Delivery Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter delivery address"
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-[#F26419]"
                  />
                </div>

                {/* Pricing / CTA */}
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex justify-between items-center text-sm font-bold text-gray-700 mb-3">
                    <span>Total Bill:</span>
                    <span className="text-[#F26419] text-base">${cartTotal.toFixed(2)}</span>
                  </div>

                  <button
                    onClick={handlePlaceOrder}
                    disabled={placingOrder || !address.trim()}
                    className="w-full py-2.5 bg-[#F26419] hover:bg-orange-600 text-white rounded-full font-bold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center space-x-1"
                  >
                    <Truck className="w-4 h-4" />
                    <span>{placingOrder ? "Placing Order..." : "Place Delivery Order"}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Browse main restaurants view
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-[#1A1A1A] tracking-tight">
            Browse Restaurants
          </h2>
          <p className="text-xs text-gray-400">
            Order macro-tracked meals prepared cleanly by our fitness partner kitchens.
          </p>
        </div>
        <button
          onClick={onBackToDashboard}
          className="px-4 py-1.5 border border-[#F26419]/20 text-[#F26419] bg-[#F26419]/5 rounded-full font-bold text-xs cursor-pointer hover:bg-[#F26419] hover:text-white transition-colors"
        >
          View Calorie Diary
        </button>
      </div>

      {/* Cuisine Filters chips */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
        {cuisines.map((cuisine) => (
          <button
            key={cuisine}
            onClick={() => setCuisineFilter(cuisine)}
            className={`px-4 py-1.5 rounded-full font-bold text-xs cursor-pointer transition-all whitespace-nowrap ${
              cuisineFilter === cuisine
                ? "bg-[#F26419] text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
            }`}
          >
            {cuisine}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-24 text-center">
          <div className="w-8 h-8 border-4 border-[#F26419] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-gray-400">Loading partner kitchens...</p>
        </div>
      ) : filteredRestaurants.length === 0 ? (
        <div className="py-24 text-center text-gray-400 bg-white rounded-2xl border border-gray-100">
          <Utensils className="w-12 h-12 mx-auto mb-2 opacity-20 animate-pulse" />
          <p className="text-sm font-bold">No active kitchens found</p>
          <p className="text-xs">Try selecting a different cuisine filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRestaurants.map((rest) => (
            <div
              key={rest.id}
              className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="p-5 space-y-3">
                <div className="w-10 h-10 rounded-full bg-[#FFF8F2] border border-[#F26419]/10 flex items-center justify-center text-[#F26419]">
                  <Utensils className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-[#1A1A1A] leading-tight text-lg">
                    {rest.name}
                  </h4>
                  <p className="text-xs text-[#F26419] font-semibold mt-0.5 capitalize">
                    {rest.cuisineType} Kitchen
                  </p>
                </div>
                <p className="text-xs text-gray-400 flex items-center">
                  <MapPin className="w-3.5 h-3.5 mr-1" />
                  {rest.address}
                </p>
              </div>

              <div className="px-5 py-4 bg-[#FFF8F2]/40 border-t border-gray-50 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleSelectRestaurant(rest)}
                  className="px-4 py-1.5 bg-[#F26419] hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
                >
                  View Menu
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
