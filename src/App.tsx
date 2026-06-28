import React from "react";
import { AuthProvider, useAuth } from "./context/AuthContext.tsx";
import { Login } from "./components/Login.tsx";
import { Onboarding } from "./components/Onboarding.tsx";
import { UserDashboard } from "./components/UserDashboard.tsx";
import { RestaurantPortal } from "./components/RestaurantPortal.tsx";

const MainAppContent: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF8F2] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-[#F26419] border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-mono font-bold text-[#F26419] tracking-wider uppercase animate-pulse">
          Starting Delish Engine...
        </p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  // If user role is not configured or they have not set active calorie goals yet, onboard them
  if (!user.role || !user.goalCalories) {
    return <Onboarding />;
  }

  if (user.role === "RESTAURANT_OWNER") {
    return <RestaurantPortal />;
  }

  return <UserDashboard />;
};

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
