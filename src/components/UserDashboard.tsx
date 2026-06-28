import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.tsx";
import { MealLog, TrendData } from "../types.ts";
import { RecipeAnalyzerModal } from "./RecipeAnalyzerModal.tsx";
import { BrowseRestaurants } from "./BrowseRestaurants.tsx";
import { motion } from "motion/react";
import {
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  ShoppingBag,
  TrendingUp,
  Apple,
  Clock,
  LogOut,
  Dumbbell,
  Settings,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

export const UserDashboard: React.FC = () => {
  const { user, logout, apiFetch } = useAuth();
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [logs, setLogs] = useState<MealLog[]>([]);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals & Navigation states
  const [analyzerOpen, setAnalyzerOpen] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<"BREAKFAST" | "LUNCH" | "DINNER" | "SNACK">("BREAKFAST");
  const [activeTab, setActiveTab] = useState<"DIARY" | "RESTAURANTS">("DIARY");
  const [trendMetric, setTrendMetric] = useState<"calories" | "protein" | "carbs" | "fat">("calories");

  useEffect(() => {
    fetchLogs();
    fetchTrends();
  }, [date, activeTab]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/meal-logs?date=${date}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error("Error loading meal logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrends = async () => {
    try {
      const res = await apiFetch("/api/meal-logs/trends");
      if (res.ok) {
        const data = await res.json();
        setTrends(data);
      }
    } catch (err) {
      console.error("Error loading trends:", err);
    }
  };

  const handleDeleteLog = async (id: string) => {
    try {
      const res = await apiFetch(`/api/meal-logs/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchLogs();
        fetchTrends();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMealClick = (type: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK") => {
    setSelectedMealType(type);
    setAnalyzerOpen(true);
  };

  // Compute nutrition totals for selected date
  const totals = logs.reduce(
    (acc, log) => {
      const mult = log.portionMultiplier || 1.0;
      return {
        calories: acc.calories + Math.round(log.calories * mult),
        protein: acc.protein + log.proteinG * mult,
        carbs: acc.carbs + log.carbsG * mult,
        fat: acc.fat + log.fatG * mult,
        fiber: acc.fiber + log.fiberG * mult,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );

  // Macro progress calculations
  const goals = {
    calories: user?.goalCalories || 2000,
    protein: user?.goalProteinG || 150,
    carbs: user?.goalCarbsG || 200,
    fat: user?.goalFatG || 65,
    fiber: 30, // Default adult goal
  };

  const pct = {
    calories: (totals.calories / goals.calories) * 100,
    protein: (totals.protein / goals.protein) * 100,
    carbs: (totals.carbs / goals.carbs) * 100,
    fat: (totals.fat / goals.fat) * 100,
    fiber: (totals.fiber / goals.fiber) * 100,
  };

  // Color mapper based on progress (green < 80%, amber 80–100%, red > 100%)
  const getProgressColor = (percent: number) => {
    if (percent < 80) return "#4CAF50"; // Success Green
    if (percent <= 100) return "#FF9800"; // Warning Amber
    return "#E53935"; // Error Red
  };

  // Helper for Circular Progress Ring SVG
  const CircularProgress: React.FC<{
    value: number;
    max: number;
    label: string;
    unit: string;
    accentColor: string;
  }> = ({ value, max, label, unit, accentColor }) => {
    const percent = Math.min(200, Math.round((value / max) * 100));
    const finalColor = getProgressColor(percent);
    const radius = 34;
    const strokeWidth = 6;
    const circumference = 2 * Math.PI * radius;
    // Cap strokeDashoffset to 0 if percent >= 100 to make full circle, but let's draw correct stroke
    const strokeDashoffset = circumference - (Math.min(100, percent) / 100) * circumference;

    return (
      <div className="flex flex-col items-center space-y-1.5 bg-white p-3 rounded-2xl border border-gray-50 shadow-sm flex-1">
        <div className="relative w-20 h-20 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            {/* Background ring */}
            <circle
              cx="40"
              cy="40"
              r={radius}
              stroke="#F3F4F6"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Foreground progress ring */}
            <circle
              cx="40"
              cy="40"
              r={radius}
              stroke={finalColor}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-500 ease-out"
            />
          </svg>
          <div className="absolute text-center">
            <span className="text-sm font-black text-[#1A1A1A] block leading-none">
              {Math.round(value)}
            </span>
            <span className="text-[9px] text-gray-400 block leading-none mt-0.5">
              / {max}
              {unit}
            </span>
          </div>
        </div>
        <div className="text-center">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
            {label}
          </p>
          <p className="text-[10px] font-black text-gray-700">
            {percent}%
          </p>
        </div>
      </div>
    );
  };

  const mealGroups = [
    { type: "BREAKFAST" as const, title: "Breakfast", icon: Clock },
    { type: "LUNCH" as const, title: "Lunch", icon: Apple },
    { type: "DINNER" as const, title: "Dinner", icon: Dumbbell },
    { type: "SNACK" as const, title: "Snacks", icon: Sparkles },
  ];

  if (activeTab === "RESTAURANTS") {
    return (
      <div className="min-h-screen bg-[#FFF8F2] pb-12">
        <header className="bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center shadow-xs">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-black text-[#F26419] tracking-tight flex items-center">
              Delish <span className="text-[#52B788] ml-0.5 text-xs">DELIVERY</span>
            </span>
          </div>
          <div className="flex items-center space-x-3 text-sm">
            <span className="text-gray-500 font-medium">Hello, {user?.name}</span>
            <button
              onClick={logout}
              className="text-gray-400 hover:text-red-500 p-1.5 hover:bg-gray-50 rounded-full transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        <main className="mt-4">
          <BrowseRestaurants onBackToDashboard={() => setActiveTab("DIARY")} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF8F2] pb-16">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center shadow-xs">
        <div className="flex items-center space-x-2 font-display">
          <span className="text-2xl font-black text-[#F26419] tracking-tight">Delish</span>
          <span className="bg-[#FFF8F2] text-[#F26419] border border-[#F26419]/25 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
            DIARY
          </span>
        </div>
        <div className="flex items-center space-x-3 text-sm">
          <div className="hidden md:block text-right">
            <p className="font-bold text-[#1A1A1A]">{user?.name}</p>
            <p className="text-[10px] font-mono text-gray-400 uppercase font-semibold">
              Target: {goals.calories} kcal
            </p>
          </div>
          <button
            onClick={() => setActiveTab("RESTAURANTS")}
            className="bg-[#F26419] hover:bg-orange-600 text-white font-bold text-xs px-4 py-2 rounded-full cursor-pointer transition-all shadow-md flex items-center"
          >
            <ShoppingBag className="w-3.5 h-3.5 mr-1.5" /> Order Food
          </button>
          <button
            onClick={logout}
            title="Logout"
            className="text-gray-400 hover:text-red-500 p-2 hover:bg-gray-50 rounded-full cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-6 space-y-6">
        {/* Date Selector */}
        <div className="flex justify-between items-center bg-white p-3 rounded-2xl border border-gray-100 shadow-sm font-display">
          <div className="flex items-center space-x-2 text-[#1A1A1A]">
            <Calendar className="w-4 h-4 text-[#F26419]" />
            <span className="font-extrabold text-sm tracking-tight">Active Tracking Day:</span>
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1 text-xs font-semibold focus:outline-none focus:border-[#F26419] cursor-pointer"
          />
        </div>

        {/* TOP: Daily Macro Summary */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider font-display">
            Daily Macro Summary ({date})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <CircularProgress
              value={totals.calories}
              max={goals.calories}
              label="Calories"
              unit="kcal"
              accentColor="#F26419"
            />
            <CircularProgress
              value={totals.protein}
              max={goals.protein}
              label="Protein"
              unit="g"
              accentColor="#E53935"
            />
            <CircularProgress
              value={totals.carbs}
              max={goals.carbs}
              label="Carbs"
              unit="g"
              accentColor="#2196F3"
            />
            <CircularProgress
              value={totals.fat}
              max={goals.fat}
              label="Fat"
              unit="g"
              accentColor="#FF9800"
            />
          </div>

          {/* Thin Fiber progress bar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-1.5">
            <div className="flex justify-between text-xs font-bold text-gray-500">
              <span className="flex items-center">
                <Apple className="w-3.5 h-3.5 text-[#52B788] mr-1" />
                Daily Fiber Intake:
              </span>
              <span>
                {totals.fiber.toFixed(1)}g / {goals.fiber}g ({Math.round(pct.fiber)}%)
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden w-full relative">
              <div
                className="h-full bg-[#52B788] transition-all duration-300"
                style={{ width: `${Math.min(100, pct.fiber)}%` }}
              />
            </div>
          </div>
        </div>

        {/* MIDDLE: Meal Log */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider font-display">
              Meal Log Book
            </h3>
            <button
              onClick={() => handleAddMealClick("BREAKFAST")}
              className="text-[#F26419] font-bold text-xs flex items-center space-x-1 hover:underline cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
              <span>AI Recipe Analyzer</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mealGroups.map((group) => {
              const groupLogs = logs.filter((l) => l.mealType === group.type);
              const groupCal = groupLogs.reduce(
                (sum, l) => sum + Math.round(l.calories * (l.portionMultiplier || 1.0)),
                0
              );

              return (
                <div
                  key={group.type}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                      <div className="flex items-center space-x-1.5 font-display">
                        <group.icon className="w-4 h-4 text-[#F26419]" />
                        <span className="font-extrabold text-sm text-[#1A1A1A]">
                          {group.title}
                        </span>
                      </div>
                      <span className="text-xs font-black text-[#F26419]">
                        {groupCal} kcal
                      </span>
                    </div>

                    {groupLogs.length === 0 ? (
                      <p className="text-xs text-gray-400 italic py-3 text-center">
                        Nothing logged for {group.title.toLowerCase()} yet.
                      </p>
                    ) : (
                      <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                        {groupLogs.map((log) => {
                          const mult = log.portionMultiplier || 1.0;
                          return (
                            <div
                              key={log.id}
                              className="bg-gray-50/50 p-2.5 rounded-xl flex justify-between items-start text-xs border border-gray-50"
                            >
                              <div className="flex-1 pr-2 min-w-0">
                                <p className="font-bold text-gray-800 truncate">
                                  {log.mealName}
                                </p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  <span className="bg-orange-50 text-[#F26419] font-semibold px-1 py-0.5 rounded text-[9px]">
                                    {Math.round(log.calories * mult)} cal
                                  </span>
                                  <span className="bg-red-50 text-red-600 font-semibold px-1 py-0.5 rounded text-[9px]">
                                    P: {(log.proteinG * mult).toFixed(0)}g
                                  </span>
                                  <span className="bg-blue-50 text-blue-600 font-semibold px-1 py-0.5 rounded text-[9px]">
                                    C: {(log.carbsG * mult).toFixed(0)}g
                                  </span>
                                  <span className="bg-yellow-50 text-yellow-500 font-semibold px-1 py-0.5 rounded text-[9px]">
                                    F: {(log.fatG * mult).toFixed(0)}g
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteLog(log.id)}
                                className="text-gray-400 hover:text-red-500 p-1 rounded-full transition-colors cursor-pointer shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddMealClick(group.type)}
                    className="w-full py-1.5 border border-dashed border-gray-200 hover:border-[#F26419] hover:bg-orange-50/30 text-gray-500 hover:text-[#F26419] rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Log {group.title}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* BOTTOM: Weekly Trend */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-gray-50 pb-2.5">
            <div className="flex items-center space-x-1.5 font-display">
              <TrendingUp className="w-4 h-4 text-[#F26419]" />
              <span className="font-extrabold text-sm text-[#1A1A1A]">
                Weekly Nutrition Trends
              </span>
            </div>
            {/* Metric Selector Buttons */}
            <div className="flex items-center space-x-1.5 mt-2 sm:mt-0 overflow-x-auto pb-1 scrollbar-none">
              {(["calories", "protein", "carbs", "fat"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setTrendMetric(m)}
                  className={`px-3 py-1 rounded-full font-bold text-[10px] capitalize cursor-pointer transition-all ${
                    trendMetric === m
                      ? "bg-[#F26419] text-white"
                      : "bg-gray-50 text-gray-500 border border-gray-100 hover:border-gray-200"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="h-60 w-full text-xs">
            {trends.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 italic">
                No history data to visualize yet. Log meals to view weekly analytics.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(str) => {
                      try {
                        const dateParts = str.split("-");
                        return `${dateParts[1]}/${dateParts[2]}`;
                      } catch {
                        return str;
                      }
                    }}
                    stroke="#9CA3AF"
                    tickLine={false}
                  />
                  <YAxis stroke="#9CA3AF" tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      borderRadius: "12px",
                      border: "1px solid #E5E7EB",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey={trendMetric}
                    name={trendMetric === "calories" ? "Calories (kcal)" : `${trendMetric} (g)`}
                    stroke={
                      trendMetric === "calories"
                        ? "#F26419"
                        : trendMetric === "protein"
                        ? "#E53935"
                        : trendMetric === "carbs"
                        ? "#2196F3"
                        : "#FF9800"
                    }
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                  {/* Reference Line for the goal */}
                  <ReferenceLine
                    y={goals[trendMetric]}
                    stroke="#52B788"
                    strokeDasharray="5 5"
                    label={{
                      value: `${goals[trendMetric]} ${trendMetric === "calories" ? "kcal" : "g"} Goal`,
                      position: "top",
                      fill: "#52B788",
                      fontSize: 10,
                      fontWeight: "bold",
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </main>

      {/* Analyzer Modal */}
      <RecipeAnalyzerModal
        isOpen={analyzerOpen}
        onClose={() => setAnalyzerOpen(false)}
        onLogSuccess={() => {
          fetchLogs();
          fetchTrends();
        }}
        defaultMealType={selectedMealType}
      />
    </div>
  );
};
