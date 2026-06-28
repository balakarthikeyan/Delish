import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.tsx";
import { motion } from "motion/react";
import { Sparkles, Utensils, Apple, Chrome, ArrowRight, ShieldCheck } from "lucide-react";

export const Login: React.FC = () => {
  const { loginWithGoogle, loginAsDemoUser, loginAsDemoOwner } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to log in with Google. Try instant demo buttons instead.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF8F2] flex items-center justify-center p-4">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 bg-white rounded-3xl shadow-2xl overflow-hidden border border-[#F26419]/10">
        
        {/* Brand Showcase Hero Column (left) */}
        <div className="md:col-span-7 bg-[#F26419] p-8 md:p-12 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Accent decoration rings */}
          <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-white/5 border border-white/10" />
          <div className="absolute -bottom-16 -right-16 w-72 h-72 rounded-full bg-white/5 border border-white/10" />

          <div className="space-y-2 relative z-10">
            <span className="text-[10px] font-mono font-bold tracking-widest bg-white/15 px-2.5 py-1 rounded-full uppercase">
              DELISH APPLET v1.0
            </span>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-none pt-4 font-display">
              Eat Healthy. <br />
              Order Smart.
            </h1>
            <p className="text-sm text-orange-100/90 max-w-sm font-medium pt-2 leading-relaxed">
              Delish marries daily calorie diary calculations, macro goal setting, and premium high-nutrition restaurant deliveries in one streamlined platform.
            </p>
          </div>

          <div className="space-y-4 pt-12 md:pt-0 relative z-10">
            <div className="flex items-center space-x-3.5 bg-white/10 p-3 rounded-2xl border border-white/10">
              <Sparkles className="w-6 h-6 shrink-0 text-yellow-300 animate-pulse" />
              <div>
                <p className="text-xs font-bold">AI-Powered Recipe Analysis</p>
                <p className="text-[10px] text-orange-50/80 leading-normal">
                  Paste any URL or recipe text. Get deep instant calorie & protein breakdown.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3.5 bg-white/10 p-3 rounded-2xl border border-white/10">
              <Apple className="w-6 h-6 shrink-0 text-[#52B788]" />
              <div>
                <p className="text-xs font-bold">Track Your Nutrition Goals</p>
                <p className="text-[10px] text-orange-50/80 leading-normal">
                  Calculate target quotas using Mifflin-St Jeor parameters automatically.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Column (right) */}
        <div className="md:col-span-5 p-8 md:p-12 flex flex-col justify-center space-y-6">
          <div className="space-y-1 font-display">
            <h2 className="text-2xl font-extrabold text-[#1A1A1A] tracking-tight">
              Get Started Now
            </h2>
            <p className="text-xs text-gray-400">
              Connect securely using Firebase Auth or launch in instant developer demo mode.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-[11px] font-medium rounded-xl leading-normal">
              {error}
            </div>
          )}

          {/* Authentic Google Sign-in */}
          <div className="space-y-3">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-3 border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50/50 text-[#1A1A1A] font-bold text-xs rounded-full flex items-center justify-center space-x-2 cursor-pointer transition-all shadow-sm"
            >
              <Chrome className="w-4 h-4 text-red-500" />
              <span>{loading ? "Connecting..." : "Continue with Google"}</span>
            </button>
          </div>

          {/* Or Divider */}
          <div className="flex items-center space-x-2 text-gray-300 text-[10px] font-bold uppercase tracking-wider py-1.5 font-display">
            <div className="flex-1 h-px bg-gray-100" />
            <span>Developer Sandbox Bypass</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Developer Sandbox Rapid Demo Login Buttons */}
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={loginAsDemoUser}
              className="w-full group p-3.5 border border-[#52B788]/20 bg-[#52B788]/5 hover:bg-[#52B788]/10 text-left rounded-2xl cursor-pointer transition-all duration-200 flex justify-between items-center"
            >
              <div className="space-y-0.5">
                <p className="text-xs font-black text-[#1A1A1A] flex items-center">
                  <Apple className="w-3.5 h-3.5 text-[#52B788] mr-1.5" />
                  Demo End User Account
                </p>
                <p className="text-[10px] text-gray-400 font-medium">
                  Evaluate macro goals, custom log book diary, and order flows.
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-[#52B788] group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              type="button"
              onClick={loginAsDemoOwner}
              className="w-full group p-3.5 border border-[#F26419]/20 bg-[#F26419]/5 hover:bg-[#F26419]/10 text-left rounded-2xl cursor-pointer transition-all duration-200 flex justify-between items-center"
            >
              <div className="space-y-0.5">
                <p className="text-xs font-black text-[#1A1A1A] flex items-center">
                  <Utensils className="w-3.5 h-3.5 text-[#F26419] mr-1.5" />
                  Demo Restaurant Owner
                </p>
                <p className="text-[10px] text-gray-400 font-medium">
                  Configure healthy menus, manage orders, and analyze payouts.
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-[#F26419] group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="text-center pt-2">
            <p className="text-[9px] text-gray-400 flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5 text-gray-300 mr-1" />
              Secure TLS Sandbox Environment. Your session is protected.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
