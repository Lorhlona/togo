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
  lineUserId: string
  postalCode: string
  address: string
  phoneNumber: string
}

export default function PatientsManagementPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { status } = useSession()
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      try {
        // セッションチェック
        if (status === 'unauthenticated') {
          router.push('/')
          return
        }

        if (status === 'loading') {
          return
        }

        // 患者データの取得
        const response = await fetch('/api/patients')
        if (!response.ok) {
          throw new Error('データの取得に失敗しました')
        }
        const data = await response.json()
        setPatients(data)
      } catch (err) {
        console.error('Error:', err)
        setError('データの取得中にエラーが発生しました')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [status, router])

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-red-500 mb-4">{error}</div>
        <button
          onClick={() => router.push('/medical')}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          戻る
        </button>
      </div>
    )
  }

  // 郵便番号のフォーマット関数
  const formatPostalCode = (code: string | null | undefined) => {
    if (!code) return ''
    const cleanCode = code.replace(/[^\d]/g, '')
    if (cleanCode.length !== 7) return code
    return cleanCode.replace(/(\d{3})(\d{4})/, '$1-$2')
  }

  // 電話番号のフォーマット関数
  const formatPhoneNumber = (number: string | null | undefined) => {
    if (!number) return ''
    const cleanNumber = number.replace(/[^\d]/g, '')
    if (cleanNumber.length === 11) {
      return cleanNumber.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3')
    } else if (cleanNumber.length === 10) {
      return cleanNumber.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')
    }
    return number
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">患者一覧</h1>
        <button
          onClick={() => router.push('/medical')}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          戻る
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 border">カルテ番号</th>
              <th className="px-4 py-2 border">氏名</th>
              <th className="px-4 py-2 border">生年月日</th>
              <th className="px-4 py-2 border">性別</th>
              <th className="px-4 py-2 border">LINE ID</th>
              <th className="px-4 py-2 border">郵便番号</th>
              <th className="px-4 py-2 border">住所</th>
              <th className="px-4 py-2 border">電話番号</th>
              <th className="px-4 py-2 border">操作</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((patient) => (
              <tr key={patient.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 border">{patient.patientId}</td>
                <td className="px-4 py-2 border">
                  {patient.lastName} {patient.firstName}
                </td>
                <td className="px-4 py-2 border">{patient.dateOfBirth}</td>
                <td className="px-4 py-2 border">{patient.gender === 'male' ? '男性' : '女性'}</td>
                <td className="px-4 py-2 border">{patient.lineUserId}</td>
                <td className="px-4 py-2 border">{formatPostalCode(patient.postalCode)}</td>
                <td className="px-4 py-2 border">{patient.address || ''}</td>
                <td className="px-4 py-2 border">{formatPhoneNumber(patient.phoneNumber)}</td>
                <td className="px-4 py-2 border">
                  <button
                    onClick={() => router.push(`/admin/patients/${patient.id}`)}
                    className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 mr-2"
                  >
                    詳細
                  </button>
                  <button
                    onClick={() => router.push(`/admin/patients/${patient.id}/karte`)}
                    className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                  >
                    カルテへ
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
