import { Skeleton } from "@/components/ui/Skeleton";
import { LEAD_STATUS_LABELS, LEAD_STATUS_ORDER } from "@/lib/constants";

export default function LeadsLoading() {
  return (
    <div className="p-4 sm:p-8 max-w-[1600px] mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {LEAD_STATUS_ORDER.map((s) => (
          <div key={s} className="card p-3 min-h-[300px] space-y-2">
            <div className="flex items-center justify-between mb-1 px-1">
              <span className="text-xs font-medium text-text-muted">
                {LEAD_STATUS_LABELS[s]}
              </span>
              <Skeleton className="h-4 w-5 rounded-full" />
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
