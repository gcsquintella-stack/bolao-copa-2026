"use client";

import { useEffect, useRef, useState } from "react";

// Anima um número de 0 (ou do valor anterior) até `value` ao montar/mudar.
// Respeita prefers-reduced-motion. Use tabular-nums no className pra não pular.
export function CountUp({
  value,
  duration = 700,
  className,
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    // reduced-motion -> duração 0 (instantâneo no próximo frame, sem setState
    // síncrono no corpo do effect).
    const dur = reduce ? 0 : duration;
    const from = fromRef.current;
    fromRef.current = value;
    let raf = 0;
    let start: number | null = null;

    const tick = (t: number) => {
      if (start === null) start = t;
      const p = dur === 0 ? 1 : Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setDisplay(Math.round(from + (value - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <span className={className}>{display}</span>;
}
