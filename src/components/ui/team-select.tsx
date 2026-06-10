"use client";

import { Select } from "@base-ui/react/select";
import { Check, ChevronsUpDown } from "lucide-react";
import { Flag } from "@/components/ui/flag";

// Dropdown de seleção de time com bandeira (Base UI). Compartilhado entre o
// formulário de bônus do jogador e o do admin (respostas oficiais).
export type TeamOption = {
  id: number;
  name: string;
  code: string | null;
  flag?: string | null;
};

export function TeamSelect({
  value,
  onChange,
  options,
  disabled,
  placeholder = "Selecione…",
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  options: TeamOption[];
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <Select.Root
      value={value}
      onValueChange={(v) => onChange(v)}
      disabled={disabled}
    >
      <Select.Trigger className="flex h-10 w-full min-w-0 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-medium shadow-sm outline-none transition-[box-shadow,border-color] focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 aria-expanded:border-primary disabled:opacity-60">
        <Select.Value>
          {(val) => {
            const sel = options.find((t) => t.id === val);
            return sel ? (
              <span className="flex min-w-0 items-center gap-2">
                <Flag code={sel.code} name={sel.name} size={20} />
                <span className="truncate">{sel.name}</span>
              </span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            );
          }}
        </Select.Value>
        <Select.Icon className="ml-auto flex-none text-muted-foreground">
          <ChevronsUpDown className="size-4" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner sideOffset={6} className="z-50">
          <Select.Popup className="max-h-72 min-w-[var(--anchor-width)] overflow-y-auto rounded-xl border border-border bg-popover p-1 text-sm text-popover-foreground shadow-lg outline-none">
            <Select.List>
              {options.map((t) => (
                <Select.Item
                  key={t.id}
                  value={t.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 outline-none data-[highlighted]:bg-secondary data-[selected]:font-semibold"
                >
                  <Flag code={t.code} name={t.name} size={20} />
                  <Select.ItemText className="truncate">
                    {t.name}
                  </Select.ItemText>
                  <Select.ItemIndicator className="ml-auto flex-none text-primary">
                    <Check className="size-4" />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
