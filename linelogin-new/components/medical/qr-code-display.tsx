'use client'

import { QRCodeSVG } from 'qrcode.react'
import { Button } from '../ui/button'

export default function QRCodeDisplay() {
  // 固定のQRコード値を設定
  const qrValue = 'kitayono-mental-clinic-checkin'

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
      <h2 className="text-lg font-semibold mb-4">受付QRコード</h2>
      <div className="flex flex-col items-center">
        <div className="mb-4">
          <QRCodeSVG
            value={qrValue}
            size={200}
            level="H"
            includeMargin={true}
          />
        </div>
        <p className="text-sm text-gray-500 mb-4">
          このQRコードを受付で読み取ってください
        </p>
        <Button
          className="w-full max-w-xs"
          onClick={() => window.print()}
        >
          QRコードを印刷
        </Button>
      </div>
    </div>
  )
}
