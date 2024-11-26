'use client'

import { useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from './ui/dialog'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { Button } from './ui/button'

interface QRScannerModalProps {
  isOpen: boolean
  onClose: () => void
  onScan: (success: boolean) => void
  reservationId: string
}

export default function QRScannerModal({ isOpen, onClose, onScan, reservationId }: QRScannerModalProps) {
  const [error, setError] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const qrRef = useRef<Html5Qrcode | null>(null)
  const isScanningRef = useRef(false)

  useEffect(() => {
    let mounted = true

    const initializeScanner = async () => {
      if (isOpen && !qrRef.current) {
        try {
          const scanner = new Html5Qrcode('qr-reader', {
            verbose: false,
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
            experimentalFeatures: {
              useBarCodeDetectorIfSupported: true
            }
          })
          qrRef.current = scanner

          if (mounted) {
            await scanner.start(
              { facingMode: 'environment' },
              {
                fps: 10,
                qrbox: { width: 250, height: 250 }
              },
              async (decodedText) => {
                if (isProcessing) return // 処理中は新しいスキャンを無視

                if (decodedText === 'kitayono-mental-clinic-checkin') {
                  setIsProcessing(true)
                  isScanningRef.current = true
                  try {
                    const response = await fetch(`/api/reservations/${reservationId}/checkin`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json'
                      }
                    })

                    const data = await response.json()

                    if (!response.ok) {
                      throw new Error(data.error || 'チェックインに失敗しました')
                    }

                    // スキャナーが実行中の場合のみ停止を試みる
                    if (qrRef.current && isScanningRef.current) {
                      try {
                        await qrRef.current.stop()
                      } catch (stopError) {
                        console.debug('スキャナー停止時の警告:', stopError)
                      }
                    }
                    // 成功コールバックを呼び出し
                    onScan(true)
                    // モーダルを閉じる
                    onClose()
                  } catch (error) {
                    console.error('チェックインエラー:', error)
                    setError(error instanceof Error ? error.message : 'チェックインに失敗しました')
                    onScan(false)
                  } finally {
                    setIsProcessing(false)
                    isScanningRef.current = false
                  }
                } else {
                  setError('無効なQRコードです')
                }
              },
              (errorMessage) => {
                // スキャン中のエラーは無視（カメラが一時的に認識できない場合など）
                console.debug('QRスキャンエラー:', errorMessage)
              }
            )
            isScanningRef.current = true
          }
        } catch (err) {
          console.error('スキャナー初期化エラー:', err)
          setError('カメラの起動に失敗しました')
          onScan(false)
        }
      }
    }

    if (isOpen) {
      // DOMが準備できてからスキャナーを初期化
      setTimeout(initializeScanner, 100)
    }

    return () => {
      mounted = false
      if (qrRef.current && isScanningRef.current) {
        qrRef.current.stop().catch(console.debug)
        qrRef.current = null
        isScanningRef.current = false
      }
    }
  }, [isOpen, onScan, reservationId, isProcessing, onClose])

  const handleClose = async () => {
    if (qrRef.current && isScanningRef.current) {
      try {
        await qrRef.current.stop()
      } catch (error) {
        console.debug('スキャナー停止時の警告:', error)
      }
      qrRef.current = null
      isScanningRef.current = false
    }
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" aria-describedby="qr-scanner-description">
        <DialogTitle>QRコードスキャナー</DialogTitle>
        <div className="flex flex-col items-center space-y-4">
          <p id="qr-scanner-description" className="text-sm text-gray-600">
            チェックイン用QRコードをスキャンしてください
          </p>
          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}
          {isProcessing && (
            <p className="text-blue-500 text-sm">処理中...</p>
          )}
          <div id="qr-reader" className="w-full max-w-sm" style={{ minHeight: '300px' }}></div>
          <Button
            onClick={handleClose}
            variant="outline"
            disabled={isProcessing}
          >
            キャンセル
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
