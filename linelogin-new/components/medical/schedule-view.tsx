import { useState } from 'react';
import { format, addDays, subDays, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import useSWR from 'swr';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';

type Patient = {
  id: string;
  lastName: string;
  firstName: string;
};

type VisitStatus = 'WAITING' | 'CHECKED_IN' | 'COMPLETED';

type Reservation = {
  id: string;
  isFirstVisit: boolean;
  patient: Patient;
  status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  visitStatus: VisitStatus;
};

type TimeSlot = {
  id: string;
  startTime: Date;
  endTime: Date;
  isAvailable: boolean;
  maxPatients: number;
  isFirstVisit: boolean;
  duration: number;
  reservations: Reservation[];
};

// APIレスポンスの型定義
type ApiTimeSlot = Omit<TimeSlot, 'startTime' | 'endTime'> & {
  startTime: string;
  endTime: string;
};

interface ScheduleViewProps {
  initialDate?: string;
}

const visitStatusLabels: Record<VisitStatus, string> = {
  WAITING: '未チェックイン',
  CHECKED_IN: 'チェックイン済',
  COMPLETED: '診察終了'
};

const visitStatusStyles: Record<VisitStatus, string> = {
  WAITING: 'bg-white text-gray-800 border-2 border-gray-300',
  CHECKED_IN: 'bg-green-50 text-green-800 border-2 border-green-500',
  COMPLETED: 'bg-blue-50 text-blue-800 border-2 border-blue-500'
};

const visitStatusButtonStyles: Record<VisitStatus, string> = {
  WAITING: 'hover:bg-green-100 border-green-500 text-green-700',
  CHECKED_IN: 'hover:bg-blue-100 border-blue-500 text-blue-700',
  COMPLETED: 'hover:bg-gray-100 border-gray-500 text-gray-700'
};

const getNextStatus = (currentStatus: VisitStatus): VisitStatus => {
  const statusFlow: Record<VisitStatus, VisitStatus> = {
    WAITING: 'CHECKED_IN',
    CHECKED_IN: 'COMPLETED',
    COMPLETED: 'WAITING'
  };
  return statusFlow[currentStatus];
};

// データフェッチャー関数
const fetcher = async (url: string): Promise<TimeSlot[]> => {
  const response = await fetch(url);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'タイムスロットの取得に失敗しました');
  }
  const data = await response.json() as ApiTimeSlot[];
  return data.map((slot: ApiTimeSlot) => ({
    ...slot,
    startTime: new Date(slot.startTime),
    endTime: new Date(slot.endTime)
  }));
};

export default function ScheduleView({ initialDate = new Date().toISOString() }: ScheduleViewProps) {
  const [selectedDate, setSelectedDate] = useState(parseISO(initialDate));
  
  // SWRを使用してデータフェッチ
  const formattedDate = format(selectedDate, 'yyyy-MM-dd');
  const { data: timeSlots, error, mutate } = useSWR<TimeSlot[], Error>(
    `/api/timeslots?startDate=${formattedDate}&endDate=${formattedDate}`,
    fetcher,
    {
      refreshInterval: 30000, // 30秒ごとに自動更新
      revalidateOnFocus: true, // タブがアクティブになった時に再検証
      dedupingInterval: 5000, // 5秒間は重複リクエストを防ぐ
    }
  );

  const handleUpdateVisitStatus = async (reservationId: string, currentStatus: VisitStatus) => {
    try {
      const newStatus = getNextStatus(currentStatus);
      const response = await fetch(`/api/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ visitStatus: newStatus }),
      });

      if (!response.ok) {
        throw new Error('状態の更新に失敗しました');
      }

      // SWRのキャッシュを即時更新
      mutate();
    } catch (error) {
      console.error('更新エラー:', error);
    }
  };

  const handlePreviousDay = () => {
    setSelectedDate(prev => subDays(prev, 1));
  };

  const handleNextDay = () => {
    setSelectedDate(prev => addDays(prev, 1));
  };

  const getPatientDisplay = (reservation: Reservation) => {
    const { patient, isFirstVisit } = reservation;
    return `${patient.lastName} ${patient.firstName}${isFirstVisit ? '（初診）' : '（再診）'}`;
  };

  if (!timeSlots) {
    return (
      <div className="p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <Button
          onClick={handlePreviousDay}
          variant="outline"
          className="px-4"
        >
          前日
        </Button>
        <h2 className="text-xl font-bold">
          {format(selectedDate, 'yyyy年 MM月 dd日（E）', { locale: ja })}
        </h2>
        <Button
          onClick={handleNextDay}
          variant="outline"
          className="px-4"
        >
          翌日
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {!error && timeSlots.length === 0 && (
        <Alert className="mb-4">
          <AlertDescription>
            この日の予約はありません。
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        {timeSlots.map((slot: TimeSlot) => {
          const confirmedReservations = slot.reservations.filter(r => r.status === 'CONFIRMED');
          
          if (confirmedReservations.length === 0) return null;

          return (
            <div
              key={slot.id}
              className="p-4 border rounded-lg bg-white shadow-sm"
            >
              <div className="flex items-center space-x-4">
                <span className="font-bold text-lg min-w-[100px]">
                  {format(slot.startTime, 'HH:mm')} - 
                  {format(slot.endTime, 'HH:mm')}
                </span>
                <span className={`text-sm px-3 py-1.5 rounded-full ${
                  slot.isFirstVisit 
                    ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' 
                    : 'bg-blue-100 text-blue-800 border border-blue-300'
                }`}>
                  {slot.duration}分枠
                </span>
                <div className="flex flex-col space-y-3 flex-grow">
                  {confirmedReservations.map((reservation: Reservation, index: number) => {
                    // visitStatusが有効な値であることを確認
                    const status = reservation.visitStatus as VisitStatus;
                    if (!visitStatusLabels[status]) return null;

                    return (
                      <div
                        key={reservation.id}
                        className={`flex items-center justify-between p-3 rounded-lg ${visitStatusStyles[status]}`}
                      >
                        <span className="font-medium">
                          {index + 1}. {getPatientDisplay(reservation)}
                        </span>
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-medium">
                            {visitStatusLabels[status]}
                          </span>
                          <Button
                            onClick={() => handleUpdateVisitStatus(reservation.id, status)}
                            variant="outline"
                            size="sm"
                            className={`min-w-[140px] border ${visitStatusButtonStyles[status]}`}
                          >
                            {visitStatusLabels[getNextStatus(status)]}へ
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
