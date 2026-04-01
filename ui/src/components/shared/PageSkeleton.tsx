import { Skeleton } from "@/components/ui/skeleton";

interface PageSkeletonProps {
  variant: "full" | "content" | "list";
}

export function PageSkeleton({ variant }: PageSkeletonProps) {
  if (variant === "full") {
    return (
      <div className="flex h-dvh items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary-500 animate-pulse" />
          <Skeleton className="w-32 h-4" />
        </div>
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className="flex flex-col gap-3 p-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    );
  }

  // content
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
      <Skeleton className="h-48 rounded-lg" />
    </div>
  );
}
