import Link from "next/link";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Action {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface Props {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: Action;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center px-6 py-12 gap-3",
        className
      )}
    >
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-bg-hover flex items-center justify-center text-text-subtle">
          <Icon className="w-6 h-6" strokeWidth={1.75} />
        </div>
      )}
      <div className="space-y-1 max-w-sm">
        <div className="text-sm font-medium text-text">{title}</div>
        {description && (
          <p className="text-xs text-text-muted leading-relaxed">{description}</p>
        )}
      </div>
      {action &&
        (action.href ? (
          <Link href={action.href} className="btn-primary mt-2">
            {action.label}
          </Link>
        ) : (
          <button
            type="button"
            onClick={action.onClick}
            className="btn-primary mt-2"
          >
            {action.label}
          </button>
        ))}
    </div>
  );
}
