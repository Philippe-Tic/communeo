export default function FicheLoading() {
  return (
    <div class="animate-pulse space-y-6">
      {/* Breadcrumb */}
      <div class="flex gap-2">
        <div class="h-4 w-16 bg-gray-200 rounded" />
        <div class="h-4 w-4 bg-gray-200 rounded" />
        <div class="h-4 w-24 bg-gray-200 rounded" />
        <div class="h-4 w-4 bg-gray-200 rounded" />
        <div class="h-4 w-32 bg-gray-200 rounded" />
      </div>

      {/* Title */}
      <div class="space-y-3">
        <div class="h-8 w-3/4 bg-gray-200 rounded" />
        <div class="h-5 w-full bg-gray-200 rounded" />
        <div class="h-4 w-40 bg-gray-200 rounded" />
      </div>

      {/* Content blocks */}
      <div class="space-y-4 pt-4">
        <div class="h-6 w-1/2 bg-gray-200 rounded" />
        <div class="h-4 w-full bg-gray-200 rounded" />
        <div class="h-4 w-full bg-gray-200 rounded" />
        <div class="h-4 w-5/6 bg-gray-200 rounded" />
      </div>
      <div class="space-y-4">
        <div class="h-6 w-2/5 bg-gray-200 rounded" />
        <div class="h-4 w-full bg-gray-200 rounded" />
        <div class="h-4 w-4/5 bg-gray-200 rounded" />
        <div class="h-4 w-full bg-gray-200 rounded" />
        <div class="h-4 w-3/4 bg-gray-200 rounded" />
      </div>
      <div class="space-y-4">
        <div class="h-6 w-1/3 bg-gray-200 rounded" />
        <div class="h-4 w-full bg-gray-200 rounded" />
        <div class="h-4 w-2/3 bg-gray-200 rounded" />
      </div>
    </div>
  )
}
