'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

interface Patient {
  id: string
  patientId: string
  lastName: string
  firstName: string
  dateOfBirth: string
  gender: string
  postalCode: string
  address: string
  phoneNumber: string
}

interface MedicalRecord {
  id: string
  visitDate: string
  content: string
}

export default function KartePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [currentSummary, setCurrentSummary] = useState('')
  const [isEditingSummary, setIsEditingSummary] = useState(false)
  const [records, setRecords] = useState<MedicalRecord[]>([])
  const [currentRecordIndex, setCurrentRecordIndex] = useState(0)
  const [isCreatingRecord, setIsCreatingRecord] = useState(false)
  const [newRecord, setNewRecord] = useState({
    visitDate: format(new Date(), 'yyyy-MM-dd'),
    content: ''
  })

  const fetchPatient = useCallback(async () => {
    try {
      const response = await fetch(`/api/patients/${params.id}`)
      if (!response.ok) throw new Error('患者情報の取得に失敗しました')
      const data = await response.json()
      setPatient(data)
    } catch (error) {
      console.error('Error:', error)
    }
  }, [params.id])

  const fetchMedicalRecords = useCallback(async () => {
    try {
      const response = await fetch(`/api/patients/${params.id}/medical-records`)
      if (!response.ok) throw new Error('カルテ情報の取得に失敗しました')
      const data = await response.json()
      setRecords(data)
    } catch (error) {
      console.error('Error:', error)
    }
  }, [params.id])

  const fetchSummaries = useCallback(async () => {
    try {
      const response = await fetch(`/api/patients/${params.id}/summaries`)
      if (!response.ok) throw new Error('サマリー情報の取得に失敗しました')
      const data = await response.json()
      if (data.length > 0) {
        setCurrentSummary(data[0].content)
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }, [params.id])

  useEffect(() => {
    fetchPatient()
    fetchMedicalRecords()
    fetchSummaries()
  }, [fetchPatient, fetchMedicalRecords, fetchSummaries])

  const handleSaveSummary = async () => {
    try {
      const response = await fetch(`/api/patients/${params.id}/summaries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: currentSummary })
      })
      if (!response.ok) throw new Error('サマリーの保存に失敗しました')
      setIsEditingSummary(false)
      await fetchSummaries()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleGenerateAISummary = async () => {
    try {
      const response = await fetch('/api/generate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          patientId: params.id,
          records: records.map(r => r.content).join('\n')
        })
      })
      if (!response.ok) throw new Error('AI サマリーの生成に失敗しました')
      const data = await response.json()
      setCurrentSummary(data.summary)
      await handleSaveSummary()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleCreateRecord = async () => {
    try {
      const response = await fetch(`/api/patients/${params.id}/medical-records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecord)
      })
      if (!response.ok) throw new Error('カルテの作成に失敗しました')
      setIsCreatingRecord(false)
      setNewRecord({
        visitDate: format(new Date(), 'yyyy-MM-dd'),
        content: ''
      })
      await fetchMedicalRecords()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  if (!patient) return <div>Loading...</div>

  return (
    <div className="container mx-auto p-4">
      {/* 患者情報 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">患者情報</h2>
          <button
            onClick={() => router.back()}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            戻る
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-gray-600">氏名</p>
            <p className="font-medium">{patient.lastName} {patient.firstName}</p>
          </div>
          <div>
            <p className="text-gray-600">生年月日</p>
            <p className="font-medium">{patient.dateOfBirth}</p>
          </div>
          <div>
            <p className="text-gray-600">性別</p>
            <p className="font-medium">{patient.gender === 'male' ? '男性' : '女性'}</p>
          </div>
          <div>
            <p className="text-gray-600">連絡先</p>
            <p className="font-medium">{patient.phoneNumber}</p>
          </div>
          <div className="col-span-2">
            <p className="text-gray-600">住所</p>
            <p className="font-medium">{patient.postalCode} {patient.address}</p>
          </div>
        </div>
      </div>

      {/* 患者サマリー */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">患者サマリー</h2>
          <div className="space-x-2">
            {isEditingSummary ? (
              <>
                <button
                  onClick={handleSaveSummary}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  保存
                </button>
                <button
                  onClick={() => setIsEditingSummary(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  キャンセル
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditingSummary(true)}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  編集
                </button>
                <button
                  onClick={handleGenerateAISummary}
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                >
                  AI
                </button>
              </>
            )}
          </div>
        </div>
        {isEditingSummary ? (
          <textarea
            value={currentSummary}
            onChange={(e) => setCurrentSummary(e.target.value)}
            className="w-full h-32 p-2 border rounded"
          />
        ) : (
          <div className="bg-gray-50 p-4 rounded">
            {currentSummary || 'サマリーはまだありません'}
          </div>
        )}
      </div>

      {/* カルテ記録 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">カルテ記録</h2>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setCurrentRecordIndex(Math.max(0, currentRecordIndex - 1))}
              disabled={currentRecordIndex === 0}
              className="disabled:opacity-50"
            >
              ←
            </button>
            <span>{records.length > 0 ? `${currentRecordIndex + 1} / ${records.length}` : '0 / 0'}</span>
            <button
              onClick={() => setCurrentRecordIndex(Math.min(records.length - 1, currentRecordIndex + 1))}
              disabled={currentRecordIndex >= records.length - 1}
              className="disabled:opacity-50"
            >
              →
            </button>
          </div>
        </div>
        {records.length > 0 && (
          <div>
            <div className="mb-4">
              <p className="text-gray-600">診療日</p>
              <p className="font-medium">{format(new Date(records[currentRecordIndex].visitDate), 'yyyy-MM-dd')}</p>
            </div>
            <div>
              <p className="text-gray-600">診療内容</p>
              <div className="bg-gray-50 p-4 rounded">
                {records[currentRecordIndex].content}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 新規カルテ作成 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">新規カルテ作成</h2>
        </div>
        {isCreatingRecord ? (
          <div className="space-y-4">
            <div>
              <label className="block text-gray-600 mb-2">診療日</label>
              <input
                type="date"
                value={newRecord.visitDate}
                onChange={(e) => setNewRecord({ ...newRecord, visitDate: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-gray-600 mb-2">診療内容</label>
              <textarea
                value={newRecord.content}
                onChange={(e) => setNewRecord({ ...newRecord, content: e.target.value })}
                className="w-full h-32 p-2 border rounded"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={handleCreateRecord}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                登録
              </button>
              <button
                onClick={() => setIsCreatingRecord(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                キャンセル
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsCreatingRecord(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            新規カルテ作成
          </button>
        )}
      </div>
    </div>
  )
}
