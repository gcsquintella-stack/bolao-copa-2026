"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Recarrega os dados do servidor (router.refresh) quando um resultado muda
// (Supabase Realtime na tabela `matches`). Usado no ranking (posições ao vivo)
// e na tela de jogos (pontos "ao vivo" do card atualizam a cada gol).
export function RealtimeRefresher() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("matches-changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "matches" },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
