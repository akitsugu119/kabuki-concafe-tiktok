import AdminGate from "@/components/admin/AdminGate";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-ink-900 text-white">
      <AdminGate>{children}</AdminGate>
    </div>
  );
}
