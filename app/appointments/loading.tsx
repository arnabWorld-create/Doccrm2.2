export default function AppointmentsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-32 bg-gradient-to-br from-brand-teal/80 to-brand-teal/60 rounded-2xl" />
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex gap-4">
          <div className="h-10 bg-gray-100 rounded-lg flex-1" />
          <div className="h-10 bg-gray-100 rounded-lg flex-1" />
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="border border-gray-100 rounded-xl p-4 flex justify-between items-center">
            <div className="space-y-2">
              <div className="h-5 w-32 bg-gray-100 rounded" />
              <div className="h-4 w-48 bg-gray-100 rounded" />
            </div>
            <div className="h-8 w-24 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
