'use client'

import Image from 'next/image'
import { signIn } from 'next-auth/react'
import { Button } from 'components/ui/button'
import { useState } from 'react'

export function KitayonoMentalClinicLogin() {
  const [isLoading, setIsLoading] = useState(false)

  const handleLineLogin = async () => {
    setIsLoading(true)
    try {
      // 絶対パスでダッシュボードURLを指定
      const dashboardUrl = `${window.location.origin}/dashboard`
      
      // LINEログインを実行
      await signIn('line', {
        callbackUrl: dashboardUrl,
        redirect: true
      })
      // redirect: true の場合、この行以降は実行されません
    } catch (error) {
      console.error('ログインエラー:', error)
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-blue-50 px-4 py-8">
      <main className="flex-1 flex flex-col justify-center">
        <div className="bg-white p-6 rounded-lg shadow-md space-y-6 max-w-sm mx-auto w-full">
          <div className="text-center space-y-4">
            <h1 className="text-xl font-semibold text-blue-800">北与野メンタルクリニック</h1>
            <div className="w-[120px] h-[120px] mx-auto rounded-full border-4 border-blue-100 bg-gray-100 flex items-center justify-center">
              <span className="text-gray-400">Logo</span>
            </div>
          </div>
          <h2 className="text-center text-xl font-medium text-gray-800">オンライン診療予約</h2>
          
          {isLoading ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">
                LINEログイン画面に移動しています...
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <p className="text-sm text-gray-600">
                  LINEアカウントでログインして予約システムをご利用ください
                </p>
                <p className="text-xs text-gray-500">
                  ※ ご利用には事前の友だち登録が必要です
                </p>
              </div>

              <Button 
                className="w-full py-3 bg-[#00B900] hover:bg-[#00A000] text-white font-semibold rounded-full flex items-center justify-center transition-colors duration-200"
                onClick={handleLineLogin}
                disabled={isLoading}
              >
                <Image
                  src="/line-logo.svg"
                  alt="LINE logo"
                  width={24}
                  height={24}
                  className="mr-2"
                />
                LINEでログイン
              </Button>
            </div>
          )}

          <div className="text-center text-sm text-gray-600 space-y-2">
            <p>⚫ 予約の確認・変更が簡単</p>
            <p>⚫ 診療に関する質問もLINEで可能</p>
            <p>⚫ 重要なお知らせをLINEでお届け</p>
          </div>
        </div>
      </main>

      <footer className="mt-8 text-center">
        <p className="text-xs text-gray-500">
          ログインすることで、当クリニックの利用規約とプライバシーポリシーに同意したことになります。
        </p>
        <p className="text-xs text-gray-500 mt-2">
          © 2023 北与野メンタルクリニック
        </p>
      </footer>
    </div>
  )
}
