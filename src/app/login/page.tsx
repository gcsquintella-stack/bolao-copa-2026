"use client";

import { useState } from "react";
import { Loader2, Mail, Trophy } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function GoogleIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.3 14.6 2.3 12 2.3 6.9 2.3 2.8 6.4 2.8 11.5S6.9 20.7 12 20.7c5.3 0 8.8-3.7 8.8-9 0-.6-.06-1-.15-1.5H12z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSending(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    setSending(false);
    if (error) {
      toast.error("Não consegui enviar o link", { description: error.message });
      return;
    }
    setSent(true);
    toast.success("Link enviado!", {
      description: "Confira seu e-mail e clique no link para entrar.",
    });
  }

  async function signInWithGoogle() {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
    if (error) {
      setGoogleLoading(false);
      toast.error("Falha no login com Google", { description: error.message });
    }
  }

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, color-mix(in oklch, var(--primary) 22%, transparent), transparent 70%)",
        }}
      />

      <div className="mb-8 flex items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
          <Trophy className="size-4.5" />
        </span>
        <div className="flex flex-col leading-tight">
          <span className="font-semibold tracking-tight">S.M.M.A</span>
          <span className="text-xs text-muted-foreground">Bolão Copa 2026</span>
        </div>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Entrar no bolão</CardTitle>
          <CardDescription>
            Use seu e-mail ou o Google. Sem senha, em segundos.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={signInWithGoogle}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            Continuar com Google
          </Button>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            ou
            <span className="h-px flex-1 bg-border" />
          </div>

          {sent ? (
            <div className="rounded-lg border border-border bg-card/50 p-4 text-center text-sm">
              <Mail className="mx-auto mb-2 size-5 text-primary" />
              Enviamos um link para <strong>{email}</strong>. Abra seu e-mail e
              clique para entrar.
            </div>
          ) : (
            <form onSubmit={sendMagicLink} className="flex flex-col gap-3">
              <div className="flex flex-col gap-2 text-left">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="voce@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={sending}>
                {sending && <Loader2 className="size-4 animate-spin" />}
                Enviar link mágico
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <p className="mt-6 max-w-xs text-center text-xs text-muted-foreground">
        Ao entrar, você concorda em jogar limpo. 🦏
      </p>
    </main>
  );
}
