'use client';

import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription } from '../ui/alert';

type TimeSlot = {
  id: string;
  startTime: string | Date;
  endTime: string | Date;
  isAvailable: boolean;
  maxPatients: number;
  isFirstVisit: boolean;
  duration: number;
};

type DayStatus = {
  date: Date;
  status: 'closed' | 'open' | 'unset';
  hasTimeSlots: boolean;
};

const CalendarView = () => {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [dayStatuses, setDayStatuses] = useState<DayStatus[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [alertMessage, setAlertMessage] = useState('');
  const [showAlert, setShowAlert] = useState(false);

  // 時間枠の取得
  useEffect(() => {
    const fetchTimeSlots = async () => {
      try {
        setError(null);
        setLoading(true);
        const start = startOfMonth(currentDate);
        const end = endOfMonth(currentDate);
        
        const startDateStr = format(start, 'yyyy-MM-dd');
        const endDateStr = format(end, 'yyyy-MM-dd');
        
        const response = await fetch(`/api/timeslots?startDate=${startDateStr}&endDate=${endDateStr}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'タイムスロットの取得に失敗しました');
        }

        const data = await response.json();

        // 日付文字列をDate型に変換
        const formattedData = data.map((slot: TimeSlot) => ({
          ...slot,
          startTime: new Date(slot.startTime),
          endTime: new Date(slot.endTime)
        }));

        setTimeSlots(formattedData);
      } catch (error) {
        console.error('タイムスロット取得エラー:', error);
        setError(error instanceof Error ? error.message : 'タイムスロットの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchTimeSlots();
  }, [currentDate]);

  // 日付ごとのステータス計算
  useEffect(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start, end });

    const statuses = days.map(date => {
      const dayTimeSlots = timeSlots.filter(slot => {
        const slotDate = new Date(slot.startTime);
        return (
          slotDate.getDate() === date.getDate() &&
          slotDate.getMonth() === date.getMonth() &&
          slotDate.getFullYear() === date.getFullYear()
        );
      });

      const hasTimeSlots = dayTimeSlots.length > 0;
      if (!hasTimeSlots) {
        return { date, status: 'unset' as const, hasTimeSlots };
      }

      const isOpen = dayTimeSlots.some(slot => slot.isAvailable);
      return {
        date,
        status: isOpen ? 'open' as const : 'closed' as const,
        hasTimeSlots
      };
    });

    setDayStatuses(statuses);
  }, [currentDate, timeSlots]);

  const handleDateClick = async (date: Date) => {
    if (!isSameMonth(date, currentDate)) return;
    
    const dateStr = format(date, 'yyyy-MM-dd');

    try {
      const dayStatus = dayStatuses.find(s => 
        s.date.getDate() === date.getDate() &&
        s.date.getMonth() === date.getMonth() &&
        s.date.getFullYear() === date.getFullYear()
      );

      // 既に時間枠がある場合は詳細画面に遷移
      if (dayStatus && dayStatus.hasTimeSlots) {
        router.push(`/admin/timeslots?date=${dateStr}`);
        return;
      }

      // 新しい時間枠を生成（曜日の初期値を使用）
      const response = await fetch('/api/timeslots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ date: dateStr }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '時間枠の生成に失敗しました');
      }

      // 時間枠を再取得
      const updatedResponse = await fetch(`/api/timeslots?startDate=${format(startOfMonth(currentDate), 'yyyy-MM-dd')}&endDate=${format(endOfMonth(currentDate), 'yyyy-MM-dd')}`);
      if (!updatedResponse.ok) {
        throw new Error('時間枠の再取得に失敗しました');
      }
      const updatedData = await updatedResponse.json();
      setTimeSlots(updatedData.map((slot: TimeSlot) => ({
        ...slot,
        startTime: new Date(slot.startTime),
        endTime: new Date(slot.endTime)
      })));

      setAlertMessage('診療日として設定しました');
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);

      // 詳細画面に遷移
      router.push(`/admin/timeslots?date=${dateStr}`);
    } catch (error) {
      console.error('時間枠設定エラー:', error);
      setError(error instanceof Error ? error.message : '時間枠の設定に失敗しました');
    }
  };

  const handlePrevMonth = () => {
    setCurrentDate(prevDate => subMonths(prevDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prevDate => addMonths(prevDate, 1));
  };

  const getDateClassName = (date: Date) => {
    const status = dayStatuses.find(s => 
      s.date.getDate() === date.getDate() &&
      s.date.getMonth() === date.getMonth() &&
      s.date.getFullYear() === date.getFullYear()
    );

    let className = 'p-2 text-center cursor-pointer hover:bg-gray-100 relative';
    
    if (!isSameMonth(date, currentDate)) {
      className += ' text-gray-300';
    } else if (isToday(date)) {
      className += ' bg-blue-100';
    }

    if (status) {
      switch (status.status) {
        case 'open':
          className += ' text-green-600 font-bold';
          break;
        case 'closed':
          className += ' text-red-600';
          break;
        case 'unset':
          className += ' text-gray-400';
          break;
      }

      if (status.hasTimeSlots) {
        className += ' after:content-["●"] after:absolute after:top-0 after:right-1 after:text-xs';
        if (status.status === 'open') {
          className += ' after:text-green-600';
        } else {
          className += ' after:text-red-600';
        }
      }
    }

    return className;
  };

  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

  const renderCalendar = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start, end });

    // 月の最初の日の曜日に基づいて空のセルを追加
    const firstDayOfWeek = start.getDay();
    const emptyCells = Array(firstDayOfWeek).fill(null);

    return (
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map(day => (
          <div key={day} className="p-2 text-center font-bold">
            {day}
          </div>
        ))}
        {emptyCells.map((_, index) => (
          <div key={`empty-${index}`} className="p-2 text-center text-gray-300">
            {/* 空のセル */}
          </div>
        ))}
        {days.map(date => (
          <div
            key={date.toISOString()}
            className={getDateClassName(date)}
            onClick={() => handleDateClick(date)}
          >
            {format(date, 'd')}
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto mb-4"></div>
          <div className="grid grid-cols-7 gap-1">
            {[...Array(35)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* アラート */}
      {showAlert && (
        <Alert variant="default" className="mb-4">
          <AlertDescription>{alertMessage}</AlertDescription>
        </Alert>
      )}

      <div className="mb-4 text-center flex justify-between items-center">
        <button
          onClick={handlePrevMonth}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded"
        >
          前月
        </button>
        <h2 className="text-xl font-bold">
          {format(currentDate, 'yyyy年 MM月', { locale: ja })}
        </h2>
        <button
          onClick={handleNextMonth}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded"
        >
          翌月
        </button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="mb-4 text-sm">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-600 rounded-full mr-1"></div>
            <span>診療日</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-600 rounded-full mr-1"></div>
            <span>休診日</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-gray-400 rounded-full mr-1"></div>
            <span>未設定</span>
          </div>
        </div>
      </div>

      {renderCalendar()}
    </div>
  );
};

export default CalendarView;
