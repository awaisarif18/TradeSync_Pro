"use client";
import { useState } from "react";
import Link from "next/link";
import RegisterMasterForm from "../../components/auth/RegisterMasterForm";
import RegisterSlaveForm from "../../components/auth/RegisterSlaveForm";

export default function RegisterPage() {
  const [role, setRole] = useState<"MASTER" | "SLAVE">("SLAVE");

  return (
    <div className="max-w-md mx-auto mt-12 p-8 bg-slate-900/50 border border-slate-800 rounded-xl backdrop-blur-sm">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-white">Create Account</h1>
        <p className="text-slate-400 mt-2">Select your trading role to begin</p>
      </div>

      {/* Role Toggle Switch */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-lg mb-8 border border-slate-800">
        <button
          onClick={() => setRole("MASTER")}
          className={`py-2 text-sm font-medium rounded-md transition-all ${
            role === "MASTER"
              ? "bg-blue-600 text-white shadow-lg"
              : "text-slate-400 hover:text-white"
          }`}
        >
          I am a Master
        </button>
        <button
          onClick={() => setRole("SLAVE")}
          className={`py-2 text-sm font-medium rounded-md transition-all ${
            role === "SLAVE"
              ? "bg-emerald-600 text-white shadow-lg"
              : "text-slate-400 hover:text-white"
          }`}
        >
          I am a Slave
        </button>
      </div>

      {/* Render Selected Form */}
      {role === "MASTER" ? <RegisterMasterForm /> : <RegisterSlaveForm />}

      <div className="mt-6 text-center text-sm text-slate-400">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-blue-500 hover:text-blue-400 font-medium"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
