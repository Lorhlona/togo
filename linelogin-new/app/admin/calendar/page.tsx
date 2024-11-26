'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import CalendarView from '../../../components/admin/calendar-view';
import { Button } from '../../../components/ui/button';

export default function CalendarManagementPage() {
  const { data: session } = useSession();
  const router = useRouter();

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">アクセス権限がありません</h1>
        <Button onClick={() => router.push('/')}>
          ホームに戻る
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">カレンダー管理</h1>
      <CalendarView />
    </div>
  );
}
