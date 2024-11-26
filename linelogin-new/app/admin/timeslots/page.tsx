'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import DayView from '../../../components/admin/day-view';
import CalendarView from '../../../components/admin/calendar-view';
import { Alert } from '../../../components/ui/alert';

function SearchParamsWrapper() {
  const searchParams = useSearchParams();
  const [showAlert, setShowAlert] = useState(false); // eslint-disable-line @typescript-eslint/no-unused-vars
  const [alertMessage, setAlertMessage] = useState(''); // eslint-disable-line @typescript-eslint/no-unused-vars
  const selectedDate = searchParams.get('date');

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">予約管理</h1>

      {/* 説明文 */}
      <div className="mb-6 bg-white rounded-lg p-4 shadow">
        <h2 className="text-lg font-semibold mb-2">予約枠の管理について</h2>
        <p className="text-gray-600 mb-2">
          カレンダーから日付を選択して、予約枠の管理を行えます。
          各時間枠は以下のように表示されます：
        </p>
        <ul className="list-disc list-inside mt-2 text-sm text-gray-600">
          <li>○：予約可能（新規予約を受け付けできます）</li>
          <li>△：残り1枠（あと1件の予約が可能です）</li>
          <li>×：予約不可（予約枠が埋まっています）</li>
          <li>ー：休診（該当時間は休診です）</li>
        </ul>
        <div className="mt-4 text-sm text-gray-600">
          <h3 className="font-semibold mb-1">操作方法：</h3>
          <ul className="list-disc list-inside">
            <li>日付をクリックすると、その日の予約枠を管理できます</li>
            <li>予約枠は15分単位で管理され、必要に応じて30分枠に結合できます</li>
            <li>初診は30分枠（1人）、再診は15分枠（2人）が基本設定です</li>
          </ul>
        </div>
      </div>

      {/* アラート */}
      {showAlert && (
        <Alert variant="default" className="mb-4">
          {alertMessage}
        </Alert>
      )}

      {/* カレンダー/日別ビュー */}
      <div className="bg-white rounded-lg shadow">
        {selectedDate ? (
          <DayView date={selectedDate} />
        ) : (
          <CalendarView />
        )}
      </div>
    </div>
  );
}

export default function TimeSlotsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse">
          <div className="text-xl font-bold text-gray-600">読み込み中...</div>
          <div className="mt-2 text-sm text-gray-500">予約管理システムを準備しています...</div>
        </div>
      </div>
    }>
      <SearchParamsWrapper />
    </Suspense>
  );
}
