import Link from "next/link";
import LoginForm from "../../components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="max-w-md mx-auto mt-16 p-8 bg-slate-900/50 border border-slate-800 rounded-xl backdrop-blur-sm">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
        <p className="text-slate-400 mt-2">
          Sign in to manage your trading node
        </p>
      </div>

      <LoginForm />

      <div className="mt-6 text-center text-sm text-slate-400">
        Don't have an account?{" "}
        <Link
          href="/register"
          className="text-blue-500 hover:text-blue-400 font-medium"
        >
          Create one
        </Link>
      </div>
    </div>
  );
}
