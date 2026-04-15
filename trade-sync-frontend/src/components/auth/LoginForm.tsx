"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { LogIn } from "lucide-react";
import Input from "../common/Input";
import Button from "../common/Button";
import { loginSuccess } from "../../redux/slices/authSlice";
import { authService } from "../../services/api";

export default function LoginForm() {
  const dispatch = useDispatch();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 1. Call the Real Backend API
      const user = await authService.login(formData.email, formData.password);

      // 2. Update Redux State with Real Data
      dispatch(loginSuccess(user));

      // 3. Redirect to Dashboard
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Login Failed:", error);
      alert("Login Failed: Please check your email and password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Input
        label="Email Address"
        type="email"
        placeholder="trader@example.com"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        required
      />
      <Input
        label="Password"
        type="password"
        placeholder="••••••••"
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        required
      />
      <Button type="submit" isLoading={isLoading}>
        <LogIn size={18} className="mr-2" /> Sign In
      </Button>
    </form>
  );
}
