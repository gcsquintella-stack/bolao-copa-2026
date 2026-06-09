import { flagSrc } from "@/lib/flags";
import { cn } from "@/lib/utils";

// Bandeira circular de alta qualidade (circle-flags, SVG local). Anel + sombra
// sutis pro acabamento "profissional". Fallback elegante quando o time ainda
// não é conhecido (placeholders de mata-mata).
export function Flag({
  code,
  name,
  size = 28,
  className,
}: {
  code?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}) {
  const src = flagSrc(code);
  const dim = { width: size, height: size };

  if (!src) {
    return (
      <span
        aria-hidden
        style={{ ...dim, fontSize: Math.round(size * 0.42) }}
        className={cn(
          "inline-grid flex-none place-items-center rounded-full bg-muted font-semibold text-muted-foreground ring-1 ring-border",
          className,
        )}
      >
        ?
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- SVG estático local, pequeno; next/image é overkill aqui
    <img
      src={src}
      alt={name ? `Bandeira de ${name}` : ""}
      style={dim}
      loading="lazy"
      decoding="async"
      className={cn(
        "flex-none rounded-full object-cover ring-1 ring-border shadow-sm",
        className,
      )}
    />
  );
}
