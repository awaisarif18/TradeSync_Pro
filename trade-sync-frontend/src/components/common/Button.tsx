import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  isLoading?: boolean;
}

export default function Button({
  children,
  variant = "primary",
  isLoading,
  className = "",
  ...props
}: ButtonProps) {
  const variants = {
    primary: "bg-emerald-500 hover:bg-emerald-400 text-slate-950",
    secondary: "bg-slate-800 hover:bg-slate-700 text-slate-200",
    danger: "bg-red-600 hover:bg-red-700 text-white",
  };

  return (
    <button
      disabled={isLoading || props.disabled}
      className={`w-full py-2.5 px-4 rounded-lg font-medium transition duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      ) : (
        children
      )}
    </button>
  );
}
