export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      <div className="w-full">{children}</div>
    </div>
  );
}
