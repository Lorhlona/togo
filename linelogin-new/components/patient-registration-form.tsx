"use client";

import { useState } from 'react'
import { Button } from './ui/button'

interface PatientRegistrationFormProps {
  onRegistrationComplete: () => void
}

// 半角英数字を全角に変換する関数（住所データの正規化用）
function normalizeAddress(str: string): string {
  // 一旦入力はそのまま受け付け、送信時に正規化する
  return str.replace(/[!-~]/g, function(s) {
    return String.fromCharCode(s.charCodeAt(0) + 0xFEE0)
  })
}

export function PatientRegistrationForm({ onRegistrationComplete }: PatientRegistrationFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    lastName: '',
    firstName: '',
    gender: '',
    dateOfBirth: '',
    phoneNumber: '',
    postalCode: '',
    address: ''
  })

  // フォームデータの検証
  const validateForm = () => {
    const errors = []

    if (!formData.lastName.trim()) errors.push('姓を入力してください')
    if (!formData.firstName.trim()) errors.push('名を入力してください')
    if (!formData.gender) errors.push('性別を選択してください')
    
    const birthDate = formData.dateOfBirth.replace(/[^\d]/g, '')
    if (!birthDate) {
      errors.push('生年月日を入力してください')
    } else if (birthDate.length !== 8) {
      errors.push('生年月日は8桁の数字で入力してください（例：19880501）')
    }
    
    const cleanPhone = formData.phoneNumber.replace(/-/g, '')
    if (!cleanPhone.match(/^\d{10,11}$/)) {
      errors.push('電話番号は10桁または11桁の数字で入力してください')
    }

    const cleanPostal = formData.postalCode.replace(/-/g, '')
    if (!cleanPostal) {
      errors.push('郵便番号を入力してください')
    } else if (!cleanPostal.match(/^\d{7}$/)) {
      errors.push('郵便番号は7桁の数字で入力してください（例：1234567）')
    }

    if (!formData.address.trim()) errors.push('住所を入力してください')

    return errors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    const errors = validateForm()
    if (errors.length > 0) {
      setError(errors.join('\n'))
      return
    }

    setIsLoading(true)

    try {
      const cleanPhoneNumber = formData.phoneNumber.replace(/-/g, '')
      const cleanPostalCode = formData.postalCode.replace(/-/g, '')
      const birthDate = formData.dateOfBirth.replace(/[^\d]/g, '')
      // 送信時に住所を正規化（半角→全角変換）
      const normalizedAddress = normalizeAddress(formData.address)

      const response = await fetch('/api/patients/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          dateOfBirth: birthDate,
          phoneNumber: cleanPhoneNumber,
          postalCode: cleanPostalCode,
          address: normalizedAddress // 正規化された住所を送信
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '登録に失敗しました')
      }

      onRegistrationComplete()
    } catch (error) {
      console.error('登録エラー:', error)
      setError(error instanceof Error ? error.message : '登録に失敗しました。もう一度お試しください。')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setError(null)
    
    let processedValue = value
    if (name === 'dateOfBirth') {
      processedValue = value.replace(/[^\d]/g, '').slice(0, 8)
    } else if (name === 'postalCode') {
      processedValue = value.replace(/[^\d]/g, '').slice(0, 7)
    }

    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }))
  }

  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/[^\d-]/g, '')
    const numbers = cleaned.replace(/-/g, '')
    
    if (numbers.length > 11) return formData.phoneNumber

    let formatted = numbers
    if (numbers.length > 3) {
      formatted = `${numbers.slice(0, 3)}-${numbers.slice(3)}`
    }
    if (numbers.length > 7) {
      formatted = `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`
    }
    return formatted
  }

  const formatPostalCode = (value: string) => {
    const cleaned = value.replace(/[^\d-]/g, '')
    const numbers = cleaned.replace(/-/g, '')
    
    if (numbers.length > 7) return formData.postalCode

    let formatted = numbers
    if (numbers.length > 3) {
      formatted = `${numbers.slice(0, 3)}-${numbers.slice(3)}`
    }
    return formatted
  }

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    const formatted = formatPhoneNumber(e.target.value)
    setFormData(prev => ({
      ...prev,
      phoneNumber: formatted
    }))
  }

  const handlePostalCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    const formatted = formatPostalCode(e.target.value)
    setFormData(prev => ({
      ...prev,
      postalCode: formatted
    }))
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">患者情報登録</h2>
      <p className="text-sm text-gray-600 mb-6">
        オンライン予約システムをご利用いただくために、以下の情報をご登録ください。
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm whitespace-pre-line">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              姓
              <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例：山田"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              名
              <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例：太郎"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            性別
            <span className="text-red-500 ml-1">*</span>
          </label>
          <select
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">選択してください</option>
            <option value="male">男性</option>
            <option value="female">女性</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            生年月日
            <span className="text-red-500 ml-1">*</span>
          </label>
          <input
            type="text"
            name="dateOfBirth"
            value={formData.dateOfBirth}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="例：19880501（8桁の数字）"
            maxLength={8}
          />
          <p className="text-xs text-gray-500 mt-1">生年月日は8桁の数字で入力してください（例：19880501）</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            電話番号
            <span className="text-red-500 ml-1">*</span>
          </label>
          <input
            type="tel"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handlePhoneNumberChange}
            required
            pattern="\d{2,3}-\d{3,4}-\d{4}"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="例：090-1234-5678"
            maxLength={13}
          />
          <p className="text-xs text-gray-500 mt-1">ハイフン（-）は自動的に追加されます</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            郵便番号
            <span className="text-red-500 ml-1">*</span>
          </label>
          <input
            type="text"
            name="postalCode"
            value={formData.postalCode}
            onChange={handlePostalCodeChange}
            required
            pattern="\d{3}-\d{4}"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="例：123-4567"
            maxLength={8}
          />
          <p className="text-xs text-gray-500 mt-1">ハイフン（-）は自動的に追加されます</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            住所
            <span className="text-red-500 ml-1">*</span>
          </label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="例：埼玉県さいたま市中央区下落合１２３４"
          />
          <p className="text-xs text-gray-500 mt-1">入力時は自由に入力できます。送信時に自動的に数字は全角に変換されます。</p>
        </div>

        <div className="pt-4">
          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            disabled={isLoading}
          >
            {isLoading ? '登録中...' : '登録する'}
          </Button>
        </div>
      </form>
    </div>
  )
}
