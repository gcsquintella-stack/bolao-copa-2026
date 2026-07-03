"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Flag } from "@/components/ui/flag";
import { cn } from "@/lib/utils";

// Chaveamento em árvore, visual e interativo. Cada vaga mostra o time definido,
// o candidato "provável" (líder atual do grupo) ou o par de seleções que disputam
// a vaga ("venc. A × B"). Conectores SVG desenhados imperativamente (medindo as
// cards) para não cair na regra set-state-in-effect. Tocar num confronto destaca
// o caminho e lista, no painel, quem ainda pode chegar àquela vaga.

export type BracketTeam = { name: string; code: string | null };

export type BracketSlot =
  | { kind: "team"; team: BracketTeam; provisional?: boolean; score?: number | null; winner?: boolean }
  | { kind: "pair"; a: BracketTeam; b: BracketTeam }
  | { kind: "pending"; label: string };

export type BracketMatch = {
  id: string;
  feeds: string | null;
  round: number;
  label?: string;
  status?: "scheduled" | "live" | "finished";
  terminal?: boolean;
  home: BracketSlot;
  away: BracketSlot;
  teams?: string[]; // seleções que ainda podem chegar a esta vaga (painel)
};

export type BracketData = { rounds: string[]; matches: BracketMatch[] };

function MiniTeam({ t }: { t: BracketTeam }) {
  return (
    <span className="flex min-w-0 items-center gap-1">
      <Flag code={t.code} name={t.name} size={16} />
      <span className="truncate text-[11px] font-medium">{t.code ?? t.name}</span>
    </span>
  );
}

function SlotRow({ slot }: { slot: BracketSlot }) {
  if (slot.kind === "team") {
    return (
      <div className="flex items-center gap-2 py-0.5">
        <Flag code={slot.team.code} name={slot.team.name} size={20} />
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-[13px]",
            slot.winner ? "font-bold" : "font-medium",
          )}
        >
          {slot.team.name}
        </span>
        {slot.provisional && (
          <span className="flex-none rounded border border-dashed border-input px-1 text-[9px] leading-4 text-muted-foreground">
            Provável
          </span>
        )}
        {slot.score != null && (
          <span
            className={cn(
              "w-4 flex-none text-right text-[13px] tabular-nums",
              slot.winner ? "font-bold" : "text-muted-foreground",
            )}
          >
            {slot.score}
          </span>
        )}
      </div>
    );
  }
  if (slot.kind === "pair") {
    return (
      <div className="flex items-center gap-1.5 py-0.5">
        <span className="flex-none rounded bg-secondary px-1 text-[9px] font-medium leading-4 text-secondary-foreground">
          Venc.
        </span>
        <MiniTeam t={slot.a} />
        <span className="flex-none text-[11px] text-muted-foreground">×</span>
        <MiniTeam t={slot.b} />
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 py-0.5">
      <span className="inline-grid size-5 flex-none place-items-center rounded-full bg-muted text-[9px] font-semibold text-muted-foreground ring-1 ring-border">
        ?
      </span>
      <span className="min-w-0 flex-1 truncate text-[12px] italic text-muted-foreground">
        {slot.label}
      </span>
    </div>
  );
}

export function BracketTree({ data }: { data: BracketData }) {
  const innerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const cardRefs = useRef(new Map<string, HTMLDivElement>());
  const drawRef = useRef<() => void>(() => {});
  const [selected, setSelected] = useState<string | null>(null);

  const byId = useMemo(() => {
    const m = new Map<string, BracketMatch>();
    for (const x of data.matches) m.set(x.id, x);
    return m;
  }, [data]);

  const childrenOf = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const x of data.matches) {
      if (!x.feeds) continue;
      const arr = m.get(x.feeds);
      if (arr) arr.push(x.id);
      else m.set(x.feeds, [x.id]);
    }
    return m;
  }, [data]);

  const active = useMemo(() => {
    if (!selected) return null;
    const set = new Set<string>([selected]);
    let cur = byId.get(selected);
    while (cur?.feeds) {
      set.add(cur.feeds);
      cur = byId.get(cur.feeds);
    }
    const stack = [selected];
    while (stack.length) {
      const id = stack.pop()!;
      for (const c of childrenOf.get(id) ?? [])
        if (!set.has(c)) {
          set.add(c);
          stack.push(c);
        }
    }
    return set;
  }, [selected, byId, childrenOf]);

  const drawConnectors = useCallback(() => {
    const inner = innerRef.current;
    const svg = svgRef.current;
    if (!inner || !svg) return;
    const cr = inner.getBoundingClientRect();
    svg.setAttribute("width", String(inner.scrollWidth));
    svg.setAttribute("height", String(inner.scrollHeight));
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    for (const m of data.matches) {
      if (!m.feeds) continue;
      const cEl = cardRefs.current.get(m.id);
      const pEl = cardRefs.current.get(m.feeds);
      if (!cEl || !pEl) continue;
      const c = cEl.getBoundingClientRect();
      const p = pEl.getBoundingClientRect();
      const x1 = c.right - cr.left;
      const y1 = c.top - cr.top + c.height / 2;
      const x2 = p.left - cr.left;
      const y2 = p.top - cr.top + p.height / 2;
      const mx = (x1 + x2) / 2;
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", `M ${x1} ${y1} H ${mx} V ${y2} H ${x2}`);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke-width", "1.5");
      const on = active ? active.has(m.id) && active.has(m.feeds) : false;
      path.setAttribute("stroke", on ? "var(--primary)" : "var(--border)");
      if (active && !on) path.setAttribute("opacity", "0.35");
      svg.appendChild(path);
    }
  }, [data, active]);

  useEffect(() => {
    drawRef.current = drawConnectors;
    drawConnectors();
  }, [drawConnectors]);

  useEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;
    const ro = new ResizeObserver(() => drawRef.current());
    ro.observe(inner);
    const onResize = () => drawRef.current();
    window.addEventListener("resize", onResize);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const rounds = useMemo(() => {
    const cols: BracketMatch[][] = data.rounds.map(() => []);
    for (const m of data.matches) (cols[m.round] ??= []).push(m);
    return cols;
  }, [data]);

  function toggle(id: string) {
    setSelected((s) => (s === id ? null : id));
  }

  const sel = selected ? byId.get(selected) : null;
  const info = !sel
    ? "Toque em um confronto para ver quais seleções disputam a vaga."
    : sel.round === 0
      ? "Confronto direto — quem vencer avança."
      : `${data.rounds[sel.round]} — ${sel.teams?.length ?? 0} seleções ainda podem disputar esta vaga: ${(sel.teams ?? []).join(", ")}.`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-secondary ring-1 ring-border" />
          Definido ou candidato atual
        </span>
        <span className="flex items-center gap-1.5">
          <span className="rounded border border-dashed border-input px-1 text-[9px]">
            Provável
          </span>
          Ainda em disputa no grupo
        </span>
      </div>

      <div className="overflow-x-auto pb-2">
        <div ref={innerRef} className="relative flex w-max">
          <svg ref={svgRef} className="pointer-events-none absolute inset-0" aria-hidden />
          {rounds.map((col, ri) => (
            <div key={ri} className="flex w-[204px] flex-none flex-col px-2.5">
              <div className="mb-2 text-center text-[11px] font-medium text-muted-foreground">
                {data.rounds[ri]}
              </div>
              <div className="flex flex-1 flex-col justify-around gap-3">
                {col.map((m) => {
                  const isSel = selected === m.id;
                  const dim = active != null && !active.has(m.id);
                  if (m.terminal) {
                    return (
                      <div
                        key={m.id}
                        ref={(el) => {
                          if (el) cardRefs.current.set(m.id, el);
                          else cardRefs.current.delete(m.id);
                        }}
                        className={cn(
                          "flex items-center gap-2 rounded-xl border border-dashed border-border bg-secondary/40 p-2.5",
                          dim && "opacity-30",
                        )}
                      >
                        <span className="grid size-6 flex-none place-items-center rounded-full bg-primary/10 text-primary">
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" /></svg>
                        </span>
                        <span className="text-[13px] font-semibold">Final</span>
                      </div>
                    );
                  }
                  return (
                    <div
                      key={m.id}
                      ref={(el) => {
                        if (el) cardRefs.current.set(m.id, el);
                        else cardRefs.current.delete(m.id);
                      }}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSel}
                      onClick={() => toggle(m.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggle(m.id);
                        }
                      }}
                      className={cn(
                        "cursor-pointer rounded-xl border bg-card p-2 shadow-sm transition-[opacity,border-color]",
                        isSel ? "border-primary ring-1 ring-primary" : "border-border hover:border-border/80",
                        dim && "opacity-30",
                      )}
                    >
                      {(m.status === "live" || m.status === "finished") && (
                        <div className="mb-1 flex justify-end text-[10px] text-muted-foreground">
                          {m.status === "live" ? (
                            <span className="inline-flex items-center gap-1 font-bold text-live">
                              <span className="size-1.5 rounded-full bg-live" />
                              AO VIVO
                            </span>
                          ) : (
                            <span>Encerrado</span>
                          )}
                        </div>
                      )}
                      <SlotRow slot={m.home} />
                      <SlotRow slot={m.away} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        aria-live="polite"
        className="rounded-xl bg-muted px-3.5 py-3 text-[13px] leading-snug text-muted-foreground"
      >
        {info}
      </div>
    </div>
  );
}
