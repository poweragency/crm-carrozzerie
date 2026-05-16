import { Skeleton, SkeletonCard, SkeletonRow } from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      <div className="mb-6 space-y-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <SkeletonCard className="h-24" />
        <SkeletonCard className="h-24" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="card p-5 lg:col-span-2">
          <Skeleton className="h-4 w-40 mb-3" />
          <Skeleton className="h-36 w-full" />
        </div>
        <div className="card p-5">
          <Skeleton className="h-4 w-40 mb-3" />
          <Skeleton className="h-36 w-full" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[0, 1].map((c) => (
          <div key={c} className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="divide-y divide-border">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
