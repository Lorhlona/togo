import Image from 'next/image'

export default function Register() {
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
          
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">
                以下のいずれかの方法でLINE友だち追加をしてください
              </p>
              <p className="text-xs text-gray-500">
                ※ 予約システムのご利用には友だち登録が必要です
              </p>
            </div>
            <div className="flex justify-center">
              <div className="relative w-[200px] h-[200px]">
                <Image
                  src="https://qr-official.line.me/gs/M_183couod_GW.png?oat_content=qr"
                  alt="LINE Add Friends QR Code"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-center">
                <a 
                  href="https://lin.ee/J272aWE"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Image
                    src="/line-add-friends-button.png"
                    alt="友だち追加"
                    width={126}
                    height={36}
                    className="hover:opacity-80 transition-opacity"
                  />
                </a>
              </div>
            </div>

            <div className="text-center text-sm text-gray-600 mt-4">
              <p>友だち追加後、LINEアプリのメニューから</p>
              <p>ログインしてご利用ください</p>
            </div>
          </div>

          <div className="text-center text-sm text-gray-600 space-y-2">
            <p>⚫ 予約の確認・変更が簡単</p>
            <p>⚫ 診療に関する質問もLINEで可能</p>
            <p>⚫ 重要なお知らせをLINEでお届け</p>
          </div>
        </div>
      </main>

      <footer className="mt-8 text-center">
        <p className="text-xs text-gray-500">
          © 2023 北与野メンタルクリニック
        </p>
      </footer>
    </div>
  )
}
