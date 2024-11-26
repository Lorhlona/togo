'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from 'components/ui/button'

function ErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          ログインエラー
        </h1>

        <div className="text-gray-600 mb-6">
          <p className="mb-2">申し訳ありません。ログイン中にエラーが発生しました。</p>
          <div className="text-sm bg-yellow-50 p-3 rounded space-y-2">
            {error && (
              <p className="font-medium">エラー: {error}</p>
            )}
            {errorDescription && (
              <p className="text-xs">{errorDescription}</p>
            )}
            {error === 'Configuration' && (
              <p>システムの設定に問題が発生しています。しばらく時間をおいて再度お試しください。</p>
            )}
            {error === 'AccessDenied' && (
              <p>アクセスが拒否されました。LINEアカウントの認証が必要です。</p>
            )}
            {error === 'OAuthSignin' && (
              <p>LINEログインの開始時にエラーが発生しました。</p>
            )}
            {error === 'OAuthCallback' && (
              <p>LINEログインのコールバック時にエラーが発生しました。</p>
            )}
            {error === 'OAuthCreateAccount' && (
              <p>アカウントの作成中にエラーが発生しました。</p>
            )}
            {error === 'Callback' && (
              <p>認証コールバック中にエラーが発生しました。</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => window.location.href = '/'}
          >
            トップページに戻る
          </Button>
          <p className="text-sm text-gray-500">
            問題が解決しない場合は、お手数ですが当院までお問い合わせください。
          </p>
        </div>
      </div>
    </div>
  )
}

export default function ErrorPage() {
  return (
    <Suspense 
      fallback={
        <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      }
    >
      <ErrorContent />
    </Suspense>
  )
}
