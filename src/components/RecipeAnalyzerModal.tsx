import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.tsx";
import { motion } from "motion/react";
import { X, Search, Sparkles, AlertCircle, Plus, Edit2 } from "lucide-react";
import { RecipeAnalysis } from "../types.ts";

interface RecipeAnalyzerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogSuccess: () => void;
  defaultMealType: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";
}

export const RecipeAnalyzerModal: React.FC<RecipeAnalyzerModalProps> = ({
  isOpen,
  onClose,
  onLogSuccess,
  defaultMealType,
}) => {
  const { apiFetch } = useAuth();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<RecipeAnalysis | null>(null);

  // Results State
  const [portion, setPortion] = useState<number>(1.0);
  const [customPortion, setCustomPortion] = useState("");
  const [mealType, setMealType] = useState<"BREAKFAST" | "LUNCH" | "DINNER" | "SNACK">(defaultMealType);
  const [isManualEdit, setIsManualEdit] = useState(false);

  // Manual Edit Inputs
  const [dishName, setDishName] = useState("");
  const [calories, setCalories] = useState(0);
  const [protein, setProtein] = useState(0);
  const [carbs, setCarbs] = useState(0);
  const [fat, setFat] = useState(0);
  const [fiber, setFiber] = useState(0);

  if (!isOpen) return null;

  const handleAnalyze = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    setAnalysis(null);

    const isUrl = input.trim().startsWith("http://") || input.trim().startsWith("https://");
    const body = isUrl ? { url: input.trim() } : { text: input.trim() };

    try {
      const res = await apiFetch("/api/analyze-recipe", {
        method: "POST",
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        setAnalysis(data);
        setDishName(data.dishName);
        setCalories(data.per_serving.calories);
        setProtein(data.per_serving.protein_g);
        setCarbs(data.per_serving.carbs_g);
        setFat(data.per_serving.fat_g);
        setFiber(data.per_serving.fiber_g);
        setPortion(1.0);
      } else {
        setError(data.error || "AI could not parse recipe. Try manual entry or paste text instead.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to reach server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLog = async () => {
    setLoading(true);
    try {
      const finalMultiplier = portion;
      const finalName = isManualEdit ? dishName : analysis?.dishName || "AI Analyzed Meal";
      const finalCalories = isManualEdit ? calories : Math.round((analysis?.per_serving.calories || 0) * finalMultiplier);
      const finalProtein = isManualEdit ? protein : parseFloat(((analysis?.per_serving.protein_g || 0) * finalMultiplier).toFixed(1));
      const finalCarbs = isManualEdit ? carbs : parseFloat(((analysis?.per_serving.carbs_g || 0) * finalMultiplier).toFixed(1));
      const finalFat = isManualEdit ? fat : parseFloat(((analysis?.per_serving.fat_g || 0) * finalMultiplier).toFixed(1));
      const finalFiber = isManualEdit ? fiber : parseFloat(((analysis?.per_serving.fiber_g || 0) * finalMultiplier).toFixed(1));

      const res = await apiFetch("/api/meal-logs", {
        method: "POST",
        body: JSON.stringify({
          mealName: finalName,
          calories: finalCalories,
          proteinG: finalProtein,
          carbsG: finalCarbs,
          fatG: finalFat,
          fiberG: finalFiber,
          portionMultiplier: finalMultiplier,
          mealType,
          source: isManualEdit ? "MANUAL" : "AI_RECIPE",
        }),
      });

      if (res.ok) {
        onLogSuccess();
        handleClose();
      } else {
        setError("Could not log meal to database");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to save meal log");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setInput("");
    setError(null);
    setAnalysis(null);
    setIsManualEdit(false);
    onClose();
  };

  const triggerManualEntry = () => {
    setIsManualEdit(true);
    setDishName(analysis?.dishName || "");
    setCalories(analysis?.per_serving.calories || 0);
    setProtein(analysis?.per_serving.protein_g || 0);
    setCarbs(analysis?.per_serving.carbs_g || 0);
    setFat(analysis?.per_serving.fat_g || 0);
    setFiber(analysis?.per_serving.fiber_g || 0);
  };

  return (
    <div className="fixed inset-0 bg-[#1A1A1A]/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-orange-500/10 overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-[#FFF8F2]">
          <h3 className="font-bold text-[#1A1A1A] text-lg flex items-center">
            <Sparkles className="w-5 h-5 text-[#F26419] mr-2" />
            AI Recipe Analyzer
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 flex items-start space-x-2 text-red-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">Error Occurred</p>
                <p>{error}</p>
                {!isManualEdit && (
                  <button
                    onClick={triggerManualEntry}
                    className="mt-1 font-bold underline cursor-pointer text-[#F26419]"
                  >
                    Log Manually Instead
                  </button>
                )}
              </div>
            </div>
          )}

          {!analysis && !isManualEdit ? (
            // Input Screen
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Paste a recipe URL or raw recipe text
                </label>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={loading}
                  rows={6}
                  placeholder="e.g. Paste: https://www.allrecipes.com/recipe/...&#10;Or paste recipe text:&#10;1 cup of rolled oats, 2 tbsp almond butter, 1 scoop vanilla whey protein, 1 banana, cup milk."
                  className="w-full p-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#F26419] focus:ring-1 focus:ring-[#F26419] placeholder-gray-400"
                />
              </div>

              <button
                type="button"
                disabled={loading || !input.trim()}
                onClick={handleAnalyze}
                className={`w-full py-3 rounded-full font-bold text-white transition-all flex items-center justify-center cursor-pointer shadow-md ${
                  loading || !input.trim()
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-[#F26419] hover:bg-orange-600 active:scale-98"
                }`}
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Analyzing with AI...</span>
                  </div>
                ) : (
                  <>
                    Analyze Recipe <Sparkles className="w-4 h-4 ml-1.5" />
                  </>
                )}
              </button>
            </div>
          ) : isManualEdit ? (
            // Manual Edit Pre-filled Form
            <div className="space-y-4">
              <h4 className="font-bold text-gray-800 text-sm">Manual Meal Entry Form</h4>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Dish Name</label>
                <input
                  type="text"
                  value={dishName}
                  onChange={(e) => setDishName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#F26419]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Calories (kcal)</label>
                  <input
                    type="number"
                    value={calories}
                    onChange={(e) => setCalories(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Protein (g)</label>
                  <input
                    type="number"
                    value={protein}
                    onChange={(e) => setProtein(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Carbs (g)</label>
                  <input
                    type="number"
                    value={carbs}
                    onChange={(e) => setCarbs(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Fat (g)</label>
                  <input
                    type="number"
                    value={fat}
                    onChange={(e) => setFat(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Fiber (g)</label>
                  <input
                    type="number"
                    value={fiber}
                    onChange={(e) => setFiber(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2">Meal Type Selection</label>
                <div className="grid grid-cols-4 gap-1.5 text-center">
                  {(["BREAKFAST", "LUNCH", "DINNER", "SNACK"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setMealType(t)}
                      className={`py-2 border rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                        mealType === t
                          ? "border-[#F26419] bg-[#F26419]/5 text-[#F26419]"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setIsManualEdit(false)}
                  className="flex-1 py-2 border border-gray-200 rounded-full font-bold text-gray-500 hover:text-gray-700 text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={loading || !dishName}
                  onClick={handleLog}
                  className="flex-1 py-2 bg-[#F26419] text-white rounded-full font-bold hover:bg-orange-600 text-sm cursor-pointer flex items-center justify-center shadow-md"
                >
                  {loading ? "Saving..." : "Log Manually"}
                </button>
              </div>
            </div>
          ) : (
            // Results screen (after successful Gemini analysis)
            <div className="space-y-5">
              <div>
                <span className="bg-[#F26419]/10 text-[#F26419] px-2.5 py-0.5 rounded-full text-xs font-mono font-bold tracking-wide">
                  AI NUTRIENT BREAKDOWN
                </span>
                <h4 className="font-extrabold text-[#1A1A1A] text-xl mt-1 tracking-tight">
                  {analysis.dishName}
                </h4>
                <p className="text-xs text-gray-400 mt-1">
                  Estimated database output based on {analysis.servings} serving(s). Adjust below.
                </p>
              </div>

              {/* Portion adjustment controls */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                  Portion Adjuster (Multiplier)
                </label>
                <div className="flex items-center space-x-2">
                  {[0.5, 1.0, 1.5, 2.0].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        setPortion(val);
                        setCustomPortion("");
                      }}
                      className={`px-3 py-1.5 border rounded-lg font-bold text-xs cursor-pointer transition-all ${
                        portion === val && !customPortion
                          ? "border-[#F26419] bg-[#F26419]/5 text-[#F26419]"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {val}x
                    </button>
                  ))}
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Custom"
                    value={customPortion}
                    onChange={(e) => {
                      setCustomPortion(e.target.value);
                      const parsed = parseFloat(e.target.value);
                      if (!isNaN(parsed) && parsed > 0) {
                        setPortion(parsed);
                      }
                    }}
                    className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-[#F26419]"
                  />
                </div>
              </div>

              {/* Dynamic Macro Preview Cards */}
              <div className="bg-[#FFF8F2] border border-[#F26419]/15 rounded-xl p-4">
                <div className="grid grid-cols-5 gap-2 text-center">
                  <div className="bg-white p-2 rounded-lg shadow-xs">
                    <p className="text-sm font-extrabold text-[#1A1A1A]">
                      {Math.round(analysis.per_serving.calories * portion)}
                    </p>
                    <p className="text-[9px] text-gray-400 font-medium">Calories</p>
                  </div>
                  <div className="bg-white p-2 rounded-lg shadow-xs border-b-2 border-red-500">
                    <p className="text-sm font-extrabold text-red-600">
                      {((analysis.per_serving.protein_g * portion).toFixed(1))}g
                    </p>
                    <p className="text-[9px] text-gray-400 font-medium">Protein</p>
                  </div>
                  <div className="bg-white p-2 rounded-lg shadow-xs border-b-2 border-blue-500">
                    <p className="text-sm font-extrabold text-blue-600">
                      {((analysis.per_serving.carbs_g * portion).toFixed(1))}g
                    </p>
                    <p className="text-[9px] text-gray-400 font-medium">Carbs</p>
                  </div>
                  <div className="bg-white p-2 rounded-lg shadow-xs border-b-2 border-yellow-500">
                    <p className="text-sm font-extrabold text-yellow-600">
                      {((analysis.per_serving.fat_g * portion).toFixed(1))}g
                    </p>
                    <p className="text-[9px] text-gray-400 font-medium">Fat</p>
                  </div>
                  <div className="bg-white p-2 rounded-lg shadow-xs border-b-2 border-[#52B788]">
                    <p className="text-sm font-extrabold text-[#52B788]">
                      {((analysis.per_serving.fiber_g * portion).toFixed(1))}g
                    </p>
                    <p className="text-[9px] text-gray-400 font-medium">Fiber</p>
                  </div>
                </div>
              </div>

              {/* Meal Type selection */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                  Which meal type to log?
                </label>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {(["BREAKFAST", "LUNCH", "DINNER", "SNACK"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setMealType(t)}
                      className={`py-2 border rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                        mealType === t
                          ? "border-[#F26419] bg-[#F26419]/5 text-[#F26419]"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Log buttons */}
              <div className="pt-4 border-t border-gray-100 flex flex-col space-y-3">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleLog}
                  className="w-full py-3 bg-[#F26419] text-white rounded-full font-bold hover:bg-orange-600 cursor-pointer shadow-md flex items-center justify-center space-x-1.5"
                >
                  <Plus className="w-5 h-5" />
                  <span>{loading ? "Logging Meal..." : "Log It to Diary"}</span>
                </button>

                <button
                  type="button"
                  onClick={triggerManualEntry}
                  className="w-full py-2 border border-gray-100 rounded-full font-semibold text-gray-500 hover:text-gray-700 text-xs cursor-pointer flex items-center justify-center"
                >
                  <Edit2 className="w-4 h-4 mr-1" /> Edit & Log Manually
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
