import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({
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
    .select("display_name, onboarded, role")
    .eq("id", user.id)
    .single();

  if (!profile?.onboarded) redirect("/onboarding");

  return (
    <AppShell
      displayName={profile.display_name}
      isAdmin={profile.role === "admin"}
    >
      {children}
    </AppShell>
  );
}
