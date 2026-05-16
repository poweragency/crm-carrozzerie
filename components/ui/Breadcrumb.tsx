import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-text-muted">
      {items.map((c, i) => {
        const last = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && (
              <ChevronRight
                className="w-3 h-3 text-text-subtle"
                strokeWidth={2}
                aria-hidden="true"
              />
            )}
            {c.href && !last ? (
              <Link
                href={c.href}
                className="hover:text-text transition-colors truncate max-w-[200px]"
              >
                {c.label}
              </Link>
            ) : (
              <span
                className={
                  last
                    ? "text-text font-medium truncate max-w-[260px]"
                    : "truncate max-w-[200px]"
                }
                aria-current={last ? "page" : undefined}
              >
                {c.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
