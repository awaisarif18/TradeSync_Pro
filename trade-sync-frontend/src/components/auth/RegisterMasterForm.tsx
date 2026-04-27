"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Input from "../common/Input";
import Button from "../common/Button";
import { authService } from "../../services/api";

export default function RegisterMasterForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Register with role: "MASTER"
      await authService.register({
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        role: "MASTER",
      });

      alert("Master Account Created Successfully! Please Login.");
      router.push("/login");
    } catch (error: any) {
      console.error("Registration Error:", error);
      alert("Registration Failed. Email might already be in use.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500"
    >
      <div className="p-4 bg-blue-900/20 border border-blue-800/50 rounded-lg mb-6">
        <h3 className="text-blue-400 font-medium text-sm mb-1">
          Master Account
        </h3>
        <p className="text-blue-200/60 text-xs">
          You will broadcast trades. Admin can issue your license key after
          account approval.
        </p>
      </div>

      <Input
        label="Full Name"
        placeholder="John Doe"
        value={formData.fullName}
        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
        required
      />
      <Input
        label="Email"
        type="email"
        placeholder="john@example.com"
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

      <Button variant="primary" type="submit" isLoading={isLoading}>
        Create Master Account
      </Button>
    </form>
  );
}
