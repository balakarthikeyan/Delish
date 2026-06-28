import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.tsx";
import { motion } from "motion/react";
import { ChevronRight, ChevronLeft, Award, Dumbbell, Flame, Apple } from "lucide-react";

export const Onboarding: React.FC = () => {
  const { user, apiFetch, refreshUser } = useAuth();
  const [step, setStep] = useState(1);
  const [name, setName] = useState(user?.name || "");
  const [age, setAge] = useState("25");
  const [weight, setWeight] = useState("70");
  const [height, setHeight] = useState("175");
  const [goal, setGoal] = useState<"LOSE" | "MAINTAIN" | "GAIN">("MAINTAIN");
  const [activityLevel, setActivityLevel] = useState<"SEDENTARY" | "LIGHT" | "MODERATE" | "ACTIVE">("MODERATE");
  const [role, setRole] = useState<"USER" | "RESTAURANT_OWNER">("USER");
  const [loading, setLoading] = useState(false);

  const calculateMacros = () => {
    const weightNum = parseFloat(weight) || 70;
    const heightNum = parseFloat(height) || 175;
    const ageNum = parseInt(age) || 25;

    // BMR using Mifflin-St Jeor (assuming male/average constant for simplicity)
    const bmr = 10 * weightNum + 6.25 * heightNum - 5 * ageNum + 5;

    const multipliers = {
      SEDENTARY: 1.2,
      LIGHT: 1.375,
      MODERATE: 1.55,
      ACTIVE: 1.725,
    };
    const multiplier = multipliers[activityLevel] || 1.2;
    let tdee = bmr * multiplier;

    if (goal === "LOSE") {
      tdee -= 500;
    } else if (goal === "GAIN") {
      tdee += 300;
    }

    const goalCalories = Math.max(1200, Math.round(tdee));
    const goalProteinG = Math.round(weightNum * 2); // 2g per kg
    const goalFatG = Math.round((goalCalories * 0.25) / 9); // 25% of calories
    const goalCarbsG = Math.max(50, Math.round((goalCalories - (goalProteinG * 4) - (goalFatG * 9)) / 4));

    return { goalCalories, goalProteinG, goalCarbsG, goalFatG };
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    const { goalCalories, goalProteinG, goalCarbsG, goalFatG } = calculateMacros();

    try {
      const res = await apiFetch("/api/users/onboard", {
        method: "POST",
        body: JSON.stringify({
          name: name || user?.name || "Delish User",
          goalCalories,
          goalProteinG,
          goalCarbsG,
          goalFatG,
          role,
        }),
      });

      if (res.ok) {
        await refreshUser();
      } else {
        console.error("Onboarding failed");
      }
    } catch (err) {
      console.error("Error during onboarding:", err);
    } finally {
      setLoading(false);
    }
  };

  const projected = calculateMacros();

  return (
    <div className="min-h-screen bg-[#FFF8F2] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-[#F26419]/10 overflow-hidden">
        {/* Progress bar */}
        <div className="h-2 bg-gray-100 w-full relative">
          <div
            className="h-full bg-[#F26419] transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        <div className="p-6 md:p-8">
          <div className="flex justify-between items-center mb-6">
            <span className="text-[#F26419] font-mono text-sm font-semibold tracking-wider">
              STEP {step} OF 3
            </span>
            <span className="text-gray-400 text-xs">
              {step === 1 && "Personal Info"}
              {step === 2 && "Aspiration & Goals"}
              {step === 3 && "Activity & Summary"}
            </span>
          </div>

          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold text-[#1A1A1A] tracking-tight">
                Welcome to Delish! Let's get to know you.
              </h2>
              <p className="text-gray-500 text-sm">
                We'll use this information to calculate your personalized daily macronutrient targets.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#F26419] focus:ring-1 focus:ring-[#F26419]"
                  placeholder="Enter your name"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Age (yrs)
                  </label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#F26419] focus:ring-1 focus:ring-[#F26419]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#F26419] focus:ring-1 focus:ring-[#F26419]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#F26419] focus:ring-1 focus:ring-[#F26419]"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Choose your account type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole("USER")}
                    className={`py-3 px-4 border rounded-xl text-center flex flex-col items-center justify-center cursor-pointer transition-all ${
                      role === "USER"
                        ? "border-[#F26419] bg-[#F26419]/5 text-[#F26419]"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <Apple className="w-5 h-5 mb-1 text-[#52B788]" />
                    <span className="font-semibold text-sm">End User</span>
                    <span className="text-[10px] text-gray-400">Order & track macros</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("RESTAURANT_OWNER")}
                    className={`py-3 px-4 border rounded-xl text-center flex flex-col items-center justify-center cursor-pointer transition-all ${
                      role === "RESTAURANT_OWNER"
                        ? "border-[#F26419] bg-[#F26419]/5 text-[#F26419]"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <Dumbbell className="w-5 h-5 mb-1 text-[#F26419]" />
                    <span className="font-semibold text-sm">Partner Owner</span>
                    <span className="text-[10px] text-gray-400">Manage restaurant & menu</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold text-[#1A1A1A] tracking-tight">
                What is your primary goal?
              </h2>
              <p className="text-gray-500 text-sm">
                This dictates whether we establish a calorie deficit, maintenance baseline, or calorie surplus.
              </p>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setGoal("LOSE")}
                  className={`w-full p-4 border rounded-xl text-left flex items-center justify-between cursor-pointer transition-all ${
                    goal === "LOSE"
                      ? "border-[#F26419] bg-[#F26419]/5 text-[#F26419]"
                      : "border-gray-200 text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Flame className="w-6 h-6 text-orange-500" />
                    <div>
                      <p className="font-bold text-sm">Lose Weight & Fat</p>
                      <p className="text-xs text-gray-500">Structured calorie deficit (-500 kcal)</p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setGoal("MAINTAIN")}
                  className={`w-full p-4 border rounded-xl text-left flex items-center justify-between cursor-pointer transition-all ${
                    goal === "MAINTAIN"
                      ? "border-[#F26419] bg-[#F26419]/5 text-[#F26419]"
                      : "border-gray-200 text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Apple className="w-6 h-6 text-[#52B788]" />
                    <div>
                      <p className="font-bold text-sm">Maintain Current Weight</p>
                      <p className="text-xs text-gray-500">Perfect energy balance and metabolic health</p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setGoal("GAIN")}
                  className={`w-full p-4 border rounded-xl text-left flex items-center justify-between cursor-pointer transition-all ${
                    goal === "GAIN"
                      ? "border-[#F26419] bg-[#F26419]/5 text-[#F26419]"
                      : "border-gray-200 text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Dumbbell className="w-6 h-6 text-blue-500" />
                    <div>
                      <p className="font-bold text-sm">Gain Muscle & Lean Mass</p>
                      <p className="text-xs text-gray-500">Clean calorie surplus (+300 kcal)</p>
                    </div>
                  </div>
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold text-[#1A1A1A] tracking-tight">
                Activity Level & Projected Targets
              </h2>
              <p className="text-gray-500 text-sm">
                Select your average lifestyle activity to refine your daily targets.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  How active are you?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {["SEDENTARY", "LIGHT", "MODERATE", "ACTIVE"].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setActivityLevel(lvl as any)}
                      className={`p-2 border rounded-xl text-center font-semibold text-xs cursor-pointer transition-all ${
                        activityLevel === lvl
                          ? "border-[#F26419] bg-[#F26419]/5 text-[#F26419]"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {lvl === "SEDENTARY" && "Sedentary (desk)"}
                      {lvl === "LIGHT" && "Lightly Active"}
                      {lvl === "MODERATE" && "Moderately Active"}
                      {lvl === "ACTIVE" && "Very Active"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Targets Preview Card */}
              <div className="bg-[#FFF8F2] border border-[#F26419]/15 rounded-xl p-4 mt-2">
                <p className="text-xs font-mono font-bold text-[#F26419] tracking-wider mb-2 uppercase flex items-center">
                  <Award className="w-4 h-4 mr-1 text-orange-500 animate-pulse" />
                  Your Custom Targets:
                </p>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-white p-2 rounded-lg shadow-sm">
                    <p className="text-lg font-extrabold text-[#1A1A1A]">{projected.goalCalories}</p>
                    <p className="text-[10px] text-gray-400 font-medium">Calories</p>
                  </div>
                  <div className="bg-white p-2 rounded-lg shadow-sm border-b-2 border-red-500">
                    <p className="text-lg font-extrabold text-red-600">{projected.goalProteinG}g</p>
                    <p className="text-[10px] text-gray-400 font-medium">Protein</p>
                  </div>
                  <div className="bg-white p-2 rounded-lg shadow-sm border-b-2 border-blue-500">
                    <p className="text-lg font-extrabold text-blue-600">{projected.goalCarbsG}g</p>
                    <p className="text-[10px] text-gray-400 font-medium">Carbs</p>
                  </div>
                  <div className="bg-white p-2 rounded-lg shadow-sm border-b-2 border-yellow-500">
                    <p className="text-lg font-extrabold text-yellow-600">{projected.goalFatG}g</p>
                    <p className="text-[10px] text-gray-400 font-medium">Fat</p>
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 mt-2 text-center italic">
                  *Protein set to 2g/kg, Fat set to 25% energy, and Carbs handle the balance.
                </p>
              </div>
            </motion.div>
          )}

          {/* Nav Buttons */}
          <div className="flex justify-between items-center mt-8 pt-4 border-t border-gray-100">
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center text-gray-500 hover:text-gray-800 font-semibold text-sm cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              disabled={loading || (step === 1 && !name)}
              onClick={handleNext}
              className={`flex items-center text-white px-6 py-2.5 rounded-full font-bold text-sm cursor-pointer shadow-md transition-all ${
                loading || (step === 1 && !name)
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-[#F26419] hover:bg-orange-600 hover:scale-105"
              }`}
            >
              {loading ? (
                "Processing..."
              ) : step === 3 ? (
                <>
                  Complete Setup <Award className="w-4 h-4 ml-1" />
                </>
              ) : (
                <>
                  Continue <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
