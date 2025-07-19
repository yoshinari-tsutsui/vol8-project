"use client"
import { useState, useRef } from 'react'

interface PhotoGameModalProps {
  isOpen: boolean
  onClose: () => void
  postId: string
  postImageUrl: string
}

export default function PhotoGameModal({ 
  isOpen, 
  onClose, 
  postId, 
  postImageUrl 
}: PhotoGameModalProps) {
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // 背面カメラを優先
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (error) {
      console.error('Camera access failed:', error)
    }
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current
      const video = videoRef.current
      const context = canvas.getContext('2d')!
      
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      context.drawImage(video, 0, 0)
      
      const imageData = canvas.toDataURL('image/jpeg', 0.8)
      setCapturedImage(imageData)
      
      // カメラを停止
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
        setStream(null)
      }
    }
  }

  const analyzePhotos = async () => {
    if (!capturedImage) return

    setIsAnalyzing(true)
    try {
      const base64Data = capturedImage.split(',')[1] // data:image/jpeg;base64, を除去
      
      const response = await fetch('/api/photo-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userPhotoBase64: base64Data,
          postPhotoUrl: postImageUrl,
        }),
      })

      const result = await response.json()
      setAnalysisResult(result)
    } catch (error) {
      console.error('Analysis failed:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const resetGame = () => {
    setCapturedImage(null)
    setAnalysisResult(null)
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">写真一致ゲーム</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <h3 className="text-lg font-medium mb-2">投稿された写真</h3>
            <img 
              src={postImageUrl} 
              alt="Post" 
              className="w-full h-48 object-cover rounded"
            />
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-2">あなたの写真</h3>
            {!capturedImage ? (
              <div className="space-y-2">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline
                  className="w-full h-48 object-cover rounded bg-gray-200"
                />
                <div className="flex gap-2">
                  <button
                    onClick={startCamera}
                    className="bg-blue-500 text-white px-4 py-2 rounded"
                  >
                    カメラ開始
                  </button>
                  <button
                    onClick={capturePhoto}
                    className="bg-green-500 text-white px-4 py-2 rounded"
                  >
                    撮影
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <img 
                  src={capturedImage} 
                  alt="Captured" 
                  className="w-full h-48 object-cover rounded"
                />
                <div className="flex gap-2">
                  <button
                    onClick={resetGame}
                    className="bg-gray-500 text-white px-4 py-2 rounded"
                  >
                    撮り直し
                  </button>
                  <button
                    onClick={analyzePhotos}
                    disabled={isAnalyzing}
                    className="bg-purple-500 text-white px-4 py-2 rounded disabled:opacity-50"
                  >
                    {isAnalyzing ? '分析中...' : '一致度を判定'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {analysisResult && (
          <div className="mt-6 p-4 bg-gray-50 rounded">
            <h3 className="text-lg font-bold mb-2">判定結果</h3>
            <div className="space-y-2">
              <div className="flex items-center">
                <span className="text-2xl font-bold text-blue-600">
                  {analysisResult.similarity}%
                </span>
                <span className="ml-2 text-gray-600">
                  (信頼度: {analysisResult.confidence}%)
                </span>
              </div>
              
              {analysisResult.similarity >= 80 ? (
                <div className="text-green-600 font-bold text-lg">
                  🎉 素晴らしい！80%以上の一致率です！
                </div>
              ) : (
                <div className="text-orange-600">
                  もう少し頑張りましょう！80%を目指しましょう。
                </div>
              )}
              
              <p className="text-gray-700 mt-2">
                {analysisResult.description}
              </p>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    </div>
  )
}