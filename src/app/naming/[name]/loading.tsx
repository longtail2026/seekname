/**
 * 名字详情页骨架屏
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-[#FDFAF4]">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-50 bg-[#FDFAF4]/95 border-b border-[#E5DDD3]">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="h-5 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* 名字头部 */}
        <div className="text-center mb-8">
          <div className="h-12 w-48 bg-gray-200 rounded animate-pulse mx-auto mb-3" />
          <div className="h-4 w-64 bg-gray-200 rounded animate-pulse mx-auto" />
        </div>

        {/* 综合评分 */}
        <div className="ancient-card p-6 mb-6 flex items-center gap-6">
          <div className="w-28 h-28 rounded-full border-8 border-gray-200 animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-4">
            <div className="h-3 w-full bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-4/5 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-3/5 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>

        {/* 五行 + 独特性 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="ancient-card p-5">
            <div className="h-3 w-20 bg-gray-200 rounded animate-pulse mb-3" />
            <div className="flex gap-2">
              <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
              <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
            </div>
          </div>
          <div className="ancient-card p-5">
            <div className="h-3 w-16 bg-gray-200 rounded animate-pulse mb-3" />
            <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse" />
          </div>
        </div>

        {/* 寓意 */}
        <div className="ancient-card p-6 mb-6">
          <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mb-3" />
          <div className="space-y-2">
            <div className="h-3 w-full bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-4/5 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-3/5 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <div className="flex-1 h-12 bg-gray-200 rounded-lg animate-pulse" />
          <div className="flex-1 h-12 bg-gray-200 rounded-lg animate-pulse" />
        </div>
      </main>
    </div>
  );
}
