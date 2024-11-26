'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface Patient {
  id: string
  patientId: string
  lastName: string
  firstName: string
  dateOfBirth: string
  gender: string
  phoneNumber: string
}

export default function PatientDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const [patient, setPatient] = useState<Patient | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedPatient, setEditedPatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
      return
    }

    const fetchPatient = async () => {
      try {
        const response = await fetch(`/api/patients/${params.id}`)
        if (!response.ok) {
          throw new Error('データの取得に失敗しました')
        }
        const data = await response.json()
        setPatient(data)
        setEditedPatient(data)
      } catch (err) {
        setError('患者データの取得中にエラーが発生しました')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchPatient()
  }, [params.id, status, router])

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditedPatient(patient)
  }

  const handleSave = async () => {
    if (!editedPatient) return

    try {
      const response = await fetch(`/api/patients/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editedPatient),
      })

      if (!response.ok) {
        throw new Error('データの更新に失敗しました')
      }

      const updatedPatient = await response.json()
      setPatient(updatedPatient)
      setIsEditing(false)
      setError('')
    } catch (err) {
      setError('患者データの更新中にエラーが発生しました')
      console.error(err)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editedPatient) return
    setEditedPatient({
      ...editedPatient,
      [e.target.name]: e.target.value,
    })
  }

  if (loading) {
    return <div className="p-4">読み込み中...</div>
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>
  }

  if (!patient) {
    return <div className="p-4">患者が見つかりません</div>
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">患者詳細</h1>
        <button
          onClick={() => router.push('/admin/patients')}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          戻る
        </button>
      </div>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 font-bold mb-2">
              カルテ番号
            </label>
            <input
              type="text"
              value={editedPatient?.patientId || ''}
              disabled
              className="w-full px-3 py-2 border rounded bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-2">
              姓
            </label>
            <input
              type="text"
              name="lastName"
              value={editedPatient?.lastName || ''}
              onChange={handleChange}
              disabled={!isEditing}
              className={`w-full px-3 py-2 border rounded ${
                isEditing ? 'bg-white' : 'bg-gray-100'
              }`}
            />
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-2">
              名
            </label>
            <input
              type="text"
              name="firstName"
              value={editedPatient?.firstName || ''}
              onChange={handleChange}
              disabled={!isEditing}
              className={`w-full px-3 py-2 border rounded ${
                isEditing ? 'bg-white' : 'bg-gray-100'
              }`}
            />
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-2">
              生年月日
            </label>
            <input
              type="date"
              name="dateOfBirth"
              value={editedPatient?.dateOfBirth || ''}
              onChange={handleChange}
              disabled={!isEditing}
              className={`w-full px-3 py-2 border rounded ${
                isEditing ? 'bg-white' : 'bg-gray-100'
              }`}
            />
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-2">
              性別
            </label>
            <input
              type="text"
              name="gender"
              value={editedPatient?.gender || ''}
              onChange={handleChange}
              disabled={!isEditing}
              className={`w-full px-3 py-2 border rounded ${
                isEditing ? 'bg-white' : 'bg-gray-100'
              }`}
            />
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-2">
              電話番号
            </label>
            <input
              type="tel"
              name="phoneNumber"
              value={editedPatient?.phoneNumber || ''}
              onChange={handleChange}
              disabled={!isEditing}
              className={`w-full px-3 py-2 border rounded ${
                isEditing ? 'bg-white' : 'bg-gray-100'
              }`}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-4">
          {!isEditing ? (
            <button
              onClick={handleEdit}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              編集
            </button>
          ) : (
            <>
              <button
                onClick={handleCancel}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                保存
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
