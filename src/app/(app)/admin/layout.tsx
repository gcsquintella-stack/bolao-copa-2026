import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Porta de entrada do admin: só quem tem role 'admin' passa (defesa extra à UI;
// o RLS já garante no banco). Jogador comum é mandado de volta pros jogos.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/jogos");

  return <>{children}</>;
}
