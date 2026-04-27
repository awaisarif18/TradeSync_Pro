"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Input from "../common/Input";
import Button from "../common/Button";
import { authService } from "../../services/api";

export default function RegisterSlaveForm() {
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
      // Register with role: "SLAVE"
      await authService.register({
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        role: "SLAVE",
      });

      toast.success("Copier account created. Please sign in.");
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
      <div className="p-4 bg-emerald-900/20 border border-emerald-800/50 rounded-lg mb-6">
        <h3 className="text-emerald-400 font-medium text-sm mb-1">
          Copier Account
        </h3>
        <p className="text-emerald-200/60 text-xs">
          You will copy trades. You need to know which Provider ID you want to
          subscribe to.
        </p>
      </div>

      <Input
        label="Full Name"
        placeholder="Jane Smith"
        value={formData.fullName}
        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
        required
      />
      <Input
        label="Email"
        type="email"
        placeholder="jane@example.com"
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

      <Button
        variant="primary"
        type="submit"
        isLoading={isLoading}
        className="bg-emerald-600 hover:bg-emerald-700"
      >
        Create Copier Account
      </Button>
    </form>
  );
}
