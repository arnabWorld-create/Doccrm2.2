export default function PatientsLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Hero skeleton */}
      <div className="h-32 bg-gradient-to-br from-brand-teal/80 to-brand-teal/60 rounded-2xl" />
      {/* Table skeleton */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 space-y-3">
          <div className="h-9 bg-gray-100 rounded-lg w-full" />
          <div className="flex gap-2">
            <div className="h-9 bg-gray-100 rounded-lg w-32" />
            <div className="h-9 bg-gray-100 rounded-lg w-28" />
          </div>
        </div>
        <div className="divide-y divide-gray-50">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="px-6 py-3.5 flex gap-4 items-center">
              <div className="h-6 w-20 bg-gray-100 rounded-full" />
              <div className="h-5 w-36 bg-gray-100 rounded" />
              <div className="h-5 w-10 bg-gray-100 rounded" />
              <div className="h-5 w-14 bg-gray-100 rounded" />
              <div className="h-5 w-24 bg-gray-100 rounded" />
              <div className="h-5 w-24 bg-gray-100 rounded ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
