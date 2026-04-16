/**
 * 典藏本详情页骨架屏
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      {/* 顶部导航 */}
      <div className="bg-white border-b border-amber-100 sticky top-[60px] z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-7 w-24 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 名字头 */}
        <div className="text-center mb-8">
          <div className="h-14 w-48 bg-gray-200 rounded animate-pulse mx-auto mb-3" />
          <div className="h-4 w-64 bg-gray-200 rounded animate-pulse mx-auto" />
        </div>

        {/* 综合评分 */}
        <div className="bg-white rounded-xl border border-amber-100 p-6 mb-6 shadow-sm">
          <div className="h-5 w-24 bg-gray-200 rounded animate-pulse mb-4" />
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-gray-200 rounded-full animate-pulse" />
            <div className="flex-1 space-y-3">
              <div className="h-2.5 w-full bg-gray-100 rounded animate-pulse" />
              <div className="h-2.5 w-4/5 bg-gray-100 rounded animate-pulse" />
              <div className="h-2.5 w-3/5 bg-gray-100 rounded animate-pulse" />
            </div>
          </div>
        </div>

        {/* 两栏 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-amber-100 p-6 shadow-sm">
              <div className="h-5 w-28 bg-gray-200 rounded animate-pulse mb-4" />
              <div className="space-y-2">
                <div className="h-3 w-full bg-gray-100 rounded animate-pulse" />
                <div className="h-3 w-4/5 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>

        {/* 备注 */}
        <div className="mt-6 bg-white rounded-xl border border-amber-100 p-6 shadow-sm">
          <div className="h-5 w-16 bg-gray-200 rounded animate-pulse mb-3" />
          <div className="h-3 w-full bg-gray-100 rounded animate-pulse" />
        </div>

        {/* 操作 */}
        <div className="mt-6 flex justify-center gap-4">
          <div className="h-11 w-40 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-11 w-40 bg-gray-200 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  );
}
