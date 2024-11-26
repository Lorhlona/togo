import { useState, useEffect, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Alert, AlertDescription } from '../ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { useRouter } from 'next/navigation';

type Patient = {
  id: string;
  lastName: string;
  firstName: string;
  lineUserId: string | null;
};

type Reservation = {
  id: string;
  isFirstVisit: boolean;
  patient: Patient;
  status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
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

interface DayViewProps {
  date: string;
}

const DayView = ({ date }: DayViewProps) => {
  const router = useRouter();
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const fetchTimeSlots = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      const response = await fetch(`/api/timeslots?startDate=${date}&endDate=${date}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'タイムスロットの取得に失敗しました');
      }

      const data = await response.json();
      setTimeSlots(data.map((slot: TimeSlot) => ({
        ...slot,
        startTime: new Date(slot.startTime),
        endTime: new Date(slot.endTime)
      })));
    } catch (error) {
      console.error('タイムスロット取得エラー:', error);
      setError(error instanceof Error ? error.message : 'タイムスロットの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [date]);

  const createTimeSlots = async () => {
    try {
      setError(null);
      setProcessing(true);

      const response = await fetch('/api/timeslots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: date,
          isOpen: true
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '時間枠の生成に失敗しました');
      }

      await fetchTimeSlots();
      setSuccess('時間枠を生成しました');
    } catch (error) {
      console.error('時間枠生成エラー:', error);
      setError(error instanceof Error ? error.message : '時間枠の生成に失敗しました');
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    fetchTimeSlots();
  }, [fetchTimeSlots]);

  const handleDeleteReservation = async () => {
    if (!selectedReservation) return;

    try {
      setError(null);
      setProcessing(true);

      const response = await fetch(`/api/reservations/${selectedReservation.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '予約の削除に失敗しました');
      }

      await fetchTimeSlots();
      setSuccess('予約を削除しました');
      setShowDeleteDialog(false);
      setSelectedReservation(null);
    } catch (error) {
      console.error('予約削除エラー:', error);
      setError(error instanceof Error ? error.message : '予約の削除に失敗しました');
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleAvailability = async (slot: TimeSlot) => {
    try {
      setError(null);
      const response = await fetch(`/api/timeslots/${slot.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: !slot.isAvailable }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '予約可否の更新に失敗しました');
      }
      
      setTimeSlots(slots =>
        slots.map(s =>
          s.id === slot.id ? { ...s, isAvailable: !s.isAvailable } : s
        )
      );
    } catch (error) {
      console.error('予約可否更新エラー:', error);
      setError(error instanceof Error ? error.message : '予約可否の更新に失敗しました');
    }
  };

  const handleToggleVisitType = async (slot: TimeSlot) => {
    try {
      setError(null);
      const response = await fetch(`/api/timeslots/${slot.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isFirstVisit: !slot.isFirstVisit,
          maxPatients: !slot.isFirstVisit ? 1 : (slot.duration === 15 ? 2 : 1)
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '診察種別の更新に失敗しました');
      }
      
      setTimeSlots(slots =>
        slots.map(s =>
          s.id === slot.id ? {
            ...s,
            isFirstVisit: !s.isFirstVisit,
            maxPatients: !s.isFirstVisit ? 1 : (s.duration === 15 ? 2 : 1)
          } : s
        )
      );
    } catch (error) {
      console.error('診察種別更新エラー:', error);
      setError(error instanceof Error ? error.message : '診察種別の更新に失敗しました');
    }
  };

  const handleCombineSlots = async (slot: TimeSlot) => {
    try {
      setError(null);
      setProcessing(true);
      
      const response = await fetch(`/api/timeslots/combine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId: slot.id,
          maxPatients: 1 // 30分枠は初診枠として1人に固定
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '時間枠の結合に失敗しました');
      }
      
      const updatedSlots = await response.json();
      if (Array.isArray(updatedSlots)) {
        setTimeSlots(updatedSlots.map(slot => ({
          ...slot,
          startTime: new Date(slot.startTime),
          endTime: new Date(slot.endTime),
          reservations: slot.reservations || []
        })));
        setSuccess('時間枠を結合しました');
      } else {
        throw new Error('サーバーからの応答が不正です');
      }
    } catch (error) {
      console.error('時間枠結合エラー:', error);
      setError(error instanceof Error ? error.message : '時間枠の結合に失敗しました');
    } finally {
      setProcessing(false);
    }
  };

  const handleSplitSlot = async (slot: TimeSlot) => {
    try {
      setError(null);
      setProcessing(true);
      
      const response = await fetch(`/api/timeslots/split`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId: slot.id,
          maxPatients: slot.isFirstVisit ? 1 : 2 // 15分枠は再診2人
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '時間枠の分割に失敗しました');
      }
      
      const updatedSlots = await response.json();
      if (Array.isArray(updatedSlots)) {
        setTimeSlots(updatedSlots.map(slot => ({
          ...slot,
          startTime: new Date(slot.startTime),
          endTime: new Date(slot.endTime),
          reservations: slot.reservations || []
        })));
        setSuccess('時間枠を分割しました');
      } else {
        throw new Error('サーバーからの応答が不正です');
      }
    } catch (error) {
      console.error('時間枠分割エラー:', error);
      setError(error instanceof Error ? error.message : '時間枠の分割に失敗しました');
    } finally {
      setProcessing(false);
    }
  };

  const handleSetAllClosed = async () => {
    try {
      setError(null);
      setProcessing(true);

      for (const slot of timeSlots) {
        const response = await fetch(`/api/timeslots/${slot.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isAvailable: false }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`時間枠 ${format(new Date(slot.startTime), 'HH:mm')} の更新に失敗しました: ${errorData.error}`);
        }
      }
      
      setTimeSlots(slots =>
        slots.map(slot => ({
          ...slot,
          isAvailable: false
        }))
      );

      setShowConfirmDialog(false);
      setSuccess('すべての時間枠を休診に設定しました。5秒後に時間枠一覧に戻ります。');
      
      setTimeout(() => {
        if (!error) {
          router.push('/admin/timeslots');
        }
      }, 5000);
    } catch (error) {
      console.error('休診設定更新エラー:', error);
      setError(error instanceof Error ? error.message : '休診設定の更新に失敗しました');
      setShowConfirmDialog(false);
    } finally {
      setProcessing(false);
    }
  };

  const getPatientDisplay = (reservation: Reservation) => {
    const { patient, isFirstVisit } = reservation;
    return `${patient.lastName} ${patient.firstName}${isFirstVisit ? '（初診）' : '（再診）'}`;
  };

  const getSlotStatus = (slot: TimeSlot) => {
    if (!slot.isAvailable) return '';  // 予約停止中は何も表示しない
    const activeReservations = slot.reservations.filter(r => r.status === 'CONFIRMED');
    const remainingSpots = slot.maxPatients - activeReservations.length;
    
    if (remainingSpots <= 0) return '';  // 満員時は何も表示しない
    if (remainingSpots === 1) return '△ あとひとり';
    return '○ あとふたり';
  };

  const getStatusColor = (status: string) => {
    switch (status.charAt(0)) {
      case '○': return 'text-green-600';
      case '△': return 'text-yellow-600';
      default: return '';  // 状態表示がない場合は色も設定しない
    }
  };

  if (loading) {
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
        <h2 className="text-xl font-bold">
          {format(parseISO(date), 'yyyy年 MM月 dd日（E）', { locale: ja })}
        </h2>
        <div className="flex space-x-2">
          <Button
            onClick={() => router.push('/admin/timeslots')}
            variant="outline"
            disabled={processing}
          >
            時間枠一覧に戻る
          </Button>
          {timeSlots.length === 0 ? (
            <Button
              onClick={createTimeSlots}
              variant="secondary"
              className="bg-green-500 hover:bg-green-600 text-white"
              disabled={processing}
            >
              {processing ? '生成中...' : '時間枠を生成'}
            </Button>
          ) : (
            <Button
              onClick={() => setShowConfirmDialog(true)}
              variant="destructive"
              className="bg-red-500 hover:bg-red-600"
              disabled={processing}
            >
              この日を休診に設定
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert variant="default" className="mb-4 bg-green-50">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {!loading && timeSlots.length === 0 && !error && (
        <Alert className="mb-4">
          <AlertDescription>
            この日の時間枠が設定されていません。「時間枠を生成」ボタンをクリックして時間枠を生成してください。
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        {timeSlots.map(slot => {
          const status = getSlotStatus(slot);
          const statusColor = getStatusColor(status);
          
          return (
            <div
              key={slot.id}
              className="flex items-center justify-between p-3 border rounded bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center space-x-4">
                <span className="font-bold text-lg">
                  {format(new Date(slot.startTime), 'HH:mm')} - 
                  {format(new Date(slot.endTime), 'HH:mm')}
                </span>
                {status && (
                  <span className={`text-lg font-bold ${statusColor} min-w-[120px]`}>
                    {status}
                  </span>
                )}
                <span className={`text-sm px-3 py-1.5 rounded-full ${
                  slot.isFirstVisit 
                    ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' 
                    : 'bg-blue-100 text-blue-800 border border-blue-300'
                }`}>
                  {slot.duration}分 {slot.isFirstVisit ? '初診' : '再診'} 
                  ({slot.maxPatients}人)
                </span>
                {slot.reservations && slot.reservations.length > 0 && (
                  <div className="flex flex-col text-sm text-gray-600">
                    <span className="font-semibold">予約者:</span>
                    {slot.reservations
                      .filter(r => r.status === 'CONFIRMED')
                      .map((r, index) => (
                        <button
                          key={r.id}
                          onClick={() => {
                            setSelectedReservation(r);
                            setShowDeleteDialog(true);
                          }}
                          className={`text-left hover:text-red-600 ${
                            r.isFirstVisit ? 'text-yellow-800' : 'text-blue-800'
                          }`}
                        >
                          {index + 1}. {getPatientDisplay(r)}
                        </button>
                      ))
                    }
                  </div>
                )}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleToggleVisitType(slot)}
                  className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                    slot.isFirstVisit 
                      ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                      : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                  }`}
                  disabled={processing || slot.reservations.length > 0}
                >
                  {slot.isFirstVisit ? '再診枠に変更' : '初診枠に変更'}
                </button>
                <button
                  onClick={() => handleToggleAvailability(slot)}
                  className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                    slot.isAvailable 
                      ? 'bg-red-500 hover:bg-red-600 text-white' 
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
                  disabled={processing}
                >
                  {slot.isAvailable ? '予約停止' : '予約再開'}
                </button>
                {slot.duration === 15 && slot.reservations.length === 0 && (
                  <button
                    onClick={() => handleCombineSlots(slot)}
                    className="px-3 py-1.5 text-sm bg-purple-500 hover:bg-purple-600 text-white rounded-full transition-colors"
                    disabled={processing}
                  >
                    30分枠に結合
                  </button>
                )}
                {slot.duration === 30 && slot.reservations.length === 0 && (
                  <button
                    onClick={() => handleSplitSlot(slot)}
                    className="px-3 py-1.5 text-sm bg-indigo-500 hover:bg-indigo-600 text-white rounded-full transition-colors"
                    disabled={processing}
                  >
                    15分枠に分割
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 休診設定確認ダイアログ */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>休診日の設定</DialogTitle>
            <DialogDescription>
              {format(parseISO(date), 'yyyy年 MM月 dd日（E）', { locale: ja })}を休診日に設定します。
              すべての時間枠が予約不可となります。よろしいですか？
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={processing}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={handleSetAllClosed}
              disabled={processing}
            >
              {processing ? '処理中...' : '休診に設定'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 予約削除確認ダイアログ */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>予約の削除</DialogTitle>
            <DialogDescription>
              {selectedReservation && (
                <>
                  {getPatientDisplay(selectedReservation)}の予約を削除します。
                  この操作は取り消せません。よろしいですか？
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setSelectedReservation(null);
              }}
              disabled={processing}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteReservation}
              disabled={processing}
            >
              {processing ? '削除中...' : '削除する'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DayView;
