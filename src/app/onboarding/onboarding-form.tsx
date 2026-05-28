"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { completeOnboarding, type OnboardingState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function OnboardingForm({ defaultName }: { defaultName: string }) {
  const [state, formAction, pending] = useActionState<OnboardingState, FormData>(
    completeOnboarding,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 text-left">
        <Label htmlFor="display_name">Como você quer aparecer no ranking?</Label>
        <Input
          id="display_name"
          name="display_name"
          defaultValue={defaultName}
          maxLength={40}
          placeholder="Seu apelido"
          autoFocus
          required
        />
        {state.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        Começar a palpitar
      </Button>
    </form>
  );
}
