import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '予約 | 北与野メンタルクリニック',
  description: 'オンライン診療の予約ページです。',
}

export default function ReservationLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div>
      {children}
    </div>
  )
}
