"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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

      toast.success("Provider account created. Please sign in.");
      router.push("/login");
    } catch (error: unknown) {
      console.error("Registration Error:", error);
      toast.error("Registration failed. Email might already be in use.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500"
    >
      <div
        className="mb-6 rounded-lg border p-4"
        style={{
          background: "var(--color-mint-soft)",
          borderColor: "var(--color-mint)",
        }}
      >
        <h3 className="text-sm font-medium" style={{ color: "var(--color-mint)" }}>
          Provider Account
        </h3>
        <p className="text-xs" style={{ color: "var(--color-text-2)" }}>
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
        Create Provider Account
      </Button>
    </form>
  );
}
