export function HotelCompleteBanner({ hotelName }: { hotelName: string }) {
  return (
    <div className="rounded-full border border-tech bg-paper-white px-4 py-2 text-body-sm font-medium text-ink shadow-card">
      {hotelName} 今日缺货已全部处理完毕
    </div>
  )
}
