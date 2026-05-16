import { Skeleton } from "@/components/ui/Skeleton";

export default function CasesLoading() {
  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center gap-3">
          <Skeleton className="h-8 flex-1 max-w-md" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="px-5 py-3 flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-2 w-1/2" />
              </div>
              <Skeleton className="h-5 w-20 rounded" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
