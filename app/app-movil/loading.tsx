export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-violet-600/50 rounded-lg animate-pulse" />
            <div>
              <div className="h-5 w-20 bg-gray-200 rounded animate-pulse mb-1" />
              <div className="h-3 w-10 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
          <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
        </div>
      </header>

      <div className="px-4 py-3 bg-white border-b border-gray-100">
        <div className="grid grid-cols-4 gap-2 text-center">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-2">
              <div className="h-7 w-8 bg-gray-200 rounded animate-pulse mx-auto mb-1" />
              <div className="h-3 w-12 bg-gray-200 rounded animate-pulse mx-auto" />
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 py-3">
        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-2" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-200 animate-pulse" />
              <div className="flex-1">
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-1" />
                <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe">
        <div className="grid grid-cols-5 gap-1 px-2 py-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1 p-2">
              <div className="w-5 h-5 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 w-8 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </nav>
    </div>
  );
}
