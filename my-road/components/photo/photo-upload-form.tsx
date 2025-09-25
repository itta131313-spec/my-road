'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { uploadExperiencePhoto, createThumbnail, isImageFile, isFileSizeValid } from '@/lib/supabase/storage'
import { createExperiencePhoto } from '@/lib/supabase/photos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Camera, Upload, X, CheckCircle, AlertCircle } from 'lucide-react'

interface PhotoUploadFormProps {
  experienceId: string
  onPhotoUploaded?: () => void
  className?: string
}

export default function PhotoUploadForm({
  experienceId,
  onPhotoUploaded,
  className = ''
}: PhotoUploadFormProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [captions, setCaptions] = useState<Record<number, string>>({})
  const [previews, setPreviews] = useState<Record<number, string>>({})
  const [uploadMessage, setUploadMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const validFiles: File[] = []
    const invalidFiles: string[] = []

    files.forEach((file) => {
      if (!isImageFile(file)) {
        invalidFiles.push(`${file.name}: 画像ファイルではありません`)
      } else if (!isFileSizeValid(file)) {
        invalidFiles.push(`${file.name}: ファイルサイズが大きすぎます（5MB以下にしてください）`)
      } else {
        validFiles.push(file)
      }
    })

    if (invalidFiles.length > 0) {
      setUploadMessage(`以下のファイルは無効です: ${invalidFiles.join(', ')}`)
      setMessageType('error')
      return
    }

    setSelectedFiles(prev => [...prev, ...validFiles])

    // プレビュー画像を生成
    validFiles.forEach((file, index) => {
      const fileIndex = selectedFiles.length + index
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreviews(prev => ({
          ...prev,
          [fileIndex]: e.target?.result as string
        }))
      }
      reader.readAsDataURL(file)
    })

    setUploadMessage('')
    setMessageType('')
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
    setPreviews(prev => {
      const newPreviews = { ...prev }
      delete newPreviews[index]
      return newPreviews
    })
    setCaptions(prev => {
      const newCaptions = { ...prev }
      delete newCaptions[index]
      return newCaptions
    })
  }

  const updateCaption = (index: number, caption: string) => {
    setCaptions(prev => ({
      ...prev,
      [index]: caption
    }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (selectedFiles.length === 0) {
      setUploadMessage('写真を選択してください')
      setMessageType('error')
      return
    }

    setIsUploading(true)
    setUploadMessage('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('ログインが必要です')
      }

      const uploadPromises = selectedFiles.map(async (file, index) => {
        // メイン画像をアップロード
        const { url: mainUrl, error: mainError } = await uploadExperiencePhoto(
          experienceId,
          file,
          user.id
        )

        if (mainError || !mainUrl) {
          throw new Error(mainError || 'アップロードに失敗しました')
        }

        // サムネイルを生成してアップロード
        let thumbnailUrl: string | undefined
        try {
          const thumbnailFile = await createThumbnail(file)
          const { url: thumbUrl } = await uploadExperiencePhoto(
            experienceId,
            thumbnailFile,
            user.id
          )
          thumbnailUrl = thumbUrl
        } catch (error) {
          console.warn('サムネイル生成に失敗:', error)
        }

        // データベースに保存
        const { error: dbError } = await createExperiencePhoto(
          experienceId,
          user.id,
          {
            photo_url: mainUrl,
            photo_thumbnail_url: thumbnailUrl,
            caption: captions[index] || undefined,
            file_size: file.size,
            mime_type: file.type,
            is_primary: index === 0 && selectedFiles.length === 1 // 1枚だけの場合はプライマリに
          }
        )

        if (dbError) {
          throw new Error(dbError)
        }

        return true
      })

      await Promise.all(uploadPromises)

      setUploadMessage(`${selectedFiles.length}枚の写真をアップロードしました！`)
      setMessageType('success')
      setSelectedFiles([])
      setPreviews({})
      setCaptions({})

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      onPhotoUploaded?.()

      // 成功メッセージを3秒後にクリア
      setTimeout(() => {
        setUploadMessage('')
        setMessageType('')
      }, 3000)

    } catch (error) {
      console.error('アップロードエラー:', error)
      setUploadMessage(error instanceof Error ? error.message : 'アップロードに失敗しました')
      setMessageType('error')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Card className={`w-full ${className}`}>
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="photos" className="text-sm font-medium flex items-center gap-2">
              <Camera className="h-4 w-4" />
              写真を追加
            </Label>
            <Input
              ref={fileInputRef}
              id="photos"
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="mt-1"
              disabled={isUploading}
            />
            <p className="text-xs text-gray-500 mt-1">
              複数選択可能 • 最大5MB/枚 • JPG, PNG, GIF対応
            </p>
          </div>

          {selectedFiles.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium">選択された写真 ({selectedFiles.length}枚)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="border rounded-lg p-3 space-y-2">
                    <div className="relative">
                      {previews[index] && (
                        <img
                          src={previews[index]}
                          alt={`プレビュー ${index + 1}`}
                          className="w-full h-32 object-cover rounded"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        disabled={isUploading}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-600 truncate">{file.name}</p>
                    <Textarea
                      placeholder="キャプション（任意）"
                      value={captions[index] || ''}
                      onChange={(e) => updateCaption(index, e.target.value)}
                      className="text-xs"
                      rows={2}
                      disabled={isUploading}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {uploadMessage && (
            <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
              messageType === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {messageType === 'success' ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              {uploadMessage}
            </div>
          )}

          <Button
            type="submit"
            disabled={isUploading || selectedFiles.length === 0}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Upload className="h-4 w-4 mr-2 animate-spin" />
                アップロード中...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                {selectedFiles.length > 0 ? `${selectedFiles.length}枚の写真をアップロード` : '写真をアップロード'}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}