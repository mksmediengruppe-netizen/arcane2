// === SKELETON LOADER — Shimmer loading states for various UI sections ===

export function SkeletonLine({ width = "100%", height = "12px" }: { width?: string; height?: string }) {
  return <div className="skeleton" style={{ width, height, marginBottom: "6px" }} />;
}

export function SkeletonBlock({ height = "60px" }: { height?: string }) {
  return <div className="skeleton rounded-lg" style={{ height, width: "100%", marginBottom: "8px" }} />;
}

export function SkeletonTaskItem() {
  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <div className="skeleton w-2 h-2 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-1">
        <SkeletonLine width="70%" height="10px" />
        <SkeletonLine width="40%" height="8px" />
      </div>
      <SkeletonLine width="30px" height="10px" />
    </div>
  );
}

export function SkeletonMessage() {
  return (
    <div className="py-3 border-b border-border/40">
      <div className="flex items-center gap-2 mb-2">
        <div className="skeleton w-5 h-5 rounded-full" />
        <SkeletonLine width="80px" height="10px" />
        <SkeletonLine width="40px" height="10px" />
      </div>
      <div className="space-y-1.5">
        <SkeletonLine width="95%" height="12px" />
        <SkeletonLine width="88%" height="12px" />
        <SkeletonLine width="72%" height="12px" />
        <SkeletonLine width="60%" height="12px" />
      </div>
    </div>
  );
}

export function SkeletonDashboardCard() {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="skeleton w-7 h-7 rounded-md" />
        <SkeletonLine width="80px" height="10px" />
      </div>
      <SkeletonLine width="60%" height="22px" />
      <SkeletonLine width="40%" height="10px" />
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <SkeletonLine width="120px" height="14px" />
      <div className="mt-4 flex items-end gap-2 h-32">
        {[60, 80, 45, 90, 70, 55, 85].map((h, i) => (
          <div key={i} className="skeleton flex-1 rounded-t" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

export default function SkeletonLoader({ type = "messages" }: { type?: "messages" | "tasks" | "dashboard" }) {
  if (type === "tasks") {
    return (
      <div className="space-y-1 p-2">
        {[1, 2, 3, 4].map(i => <SkeletonTaskItem key={i} />)}
      </div>
    );
  }
  if (type === "dashboard") {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <SkeletonDashboardCard key={i} />)}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <SkeletonChart />
          <SkeletonChart />
        </div>
      </div>
    );
  }
  // messages
  return (
    <div className="px-5 py-2">
      {[1, 2, 3].map(i => <SkeletonMessage key={i} />)}
    </div>
  );
}
