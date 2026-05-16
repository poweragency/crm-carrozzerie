import { Skeleton } from "@/components/ui/Skeleton";

export default function CalendarLoading() {
  return (
    <div className="h-full flex flex-col">
      <div className="px-8 py-4 border-b border-border flex items-center gap-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="ml-auto h-9 w-64" />
      </div>
      <div className="p-6 flex-1">
        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border border-border">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={`h${i}`} className="h-8 rounded-none" />
          ))}
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={`c${i}`} className="min-h-[110px] rounded-none" />
          ))}
        </div>
      </div>
    </div>
  );
}
