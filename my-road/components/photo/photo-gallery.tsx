'use client'

import { useState, useEffect } from 'react'
import { ExperiencePhoto } from '@/lib/types/future-features'
import { getExperiencePhotos, setPrimaryPhoto, deleteExperiencePhoto } from '@/lib/supabase/photos'
import { deleteExperiencePhoto as deleteFromStorage } from '@/lib/supabase/storage'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import {
  MoreHorizontal,
  Star,
  Trash2,
  Eye,
  Calendar,
  User,
  AlertCircle,
  Image as ImageIcon
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface PhotoGalleryProps {
  experienceId: string
  isOwner?: boolean
  className?: string
  showUploadForm?: boolean
}

export default function PhotoGallery({
  experienceId,
  isOwner = false,
  className = '',
  showUploadForm = false
}: PhotoGalleryProps) {
  const [photos, setPhotos] = useState<ExperiencePhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPhoto, setSelectedPhoto] = useState<ExperiencePhoto | null>(null)
  const [actionLoading, setActionLoading] = useState<string>('')
  const [error, setError] = useState('')

  const supabase = createClient()

  useEffect(() => {
    loadPhotos()
  }, [experienceId])

  const loadPhotos = async () => {
    try {
      setLoading(true)
      const photosData = await getExperiencePhotos(experienceId)
      setPhotos(photosData)
      setError('')
    } catch (err) {
      console.error('写真読み込みエラー:', err)
      setError('写真の読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleSetPrimary = async (photoId: string) => {
    try {
      setActionLoading(photoId)
      const { success, error } = await setPrimaryPhoto(experienceId, photoId)

      if (success) {
        await loadPhotos() // 再読み込み
      } else {
        setError(error || 'プライマリ写真の設定に失敗しました')
      }
    } catch (err) {
      console.error('プライマリ設定エラー:', err)
      setError('プライマリ写真の設定に失敗しました')
    } finally {
      setActionLoading('')
    }
  }

  const handleDelete = async (photo: ExperiencePhoto) => {
    if (!confirm('この写真を削除しますか？この操作は取り消せません。')) {
      return
    }

    try {
      setActionLoading(photo.id)

      // ストレージから削除
      await deleteFromStorage(photo.photo_url)
      if (photo.photo_thumbnail_url) {
        await deleteFromStorage(photo.photo_thumbnail_url)
      }

      // データベースから削除
      const { success, error } = await deleteExperiencePhoto(photo.id)

      if (success) {
        await loadPhotos() // 再読み込み
        if (selectedPhoto?.id === photo.id) {
          setSelectedPhoto(null)
        }
      } else {
        setError(error || '写真の削除に失敗しました')
      }
    } catch (err) {
      console.error('削除エラー:', err)
      setError('写真の削除に失敗しました')
    } finally {
      setActionLoading('')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="animate-pulse">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-square bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg ${className}`}>
        <AlertCircle className="h-5 w-5" />
        <p>{error}</p>
        <Button
          onClick={loadPhotos}
          variant="outline"
          size="sm"
          className="ml-auto"
        >
          再試行
        </Button>
      </div>
    )
  }

  if (photos.length === 0) {
    return (
      <div className={`text-center p-8 bg-gray-50 rounded-lg ${className}`}>
        <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500">まだ写真が投稿されていません</p>
        {showUploadForm && (
          <p className="text-sm text-gray-400 mt-2">
            上のフォームから写真を投稿してみましょう
          </p>
        )}
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          写真 ({photos.length}枚)
        </h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {photos.map((photo) => (
          <Card key={photo.id} className="group overflow-hidden hover:shadow-md transition-shadow">
            <CardContent className="p-0 relative">
              {photo.is_primary && (
                <Badge className="absolute top-2 left-2 z-10 bg-yellow-500 text-white">
                  <Star className="h-3 w-3 mr-1" />
                  メイン
                </Badge>
              )}

              {isOwner && (
                <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-8 w-8 p-0"
                        disabled={actionLoading === photo.id}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {!photo.is_primary && (
                        <>
                          <DropdownMenuItem onClick={() => handleSetPrimary(photo.id)}>
                            <Star className="h-4 w-4 mr-2" />
                            メイン写真に設定
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      <DropdownMenuItem
                        onClick={() => handleDelete(photo)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        削除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}

              <Dialog>
                <DialogTrigger asChild>
                  <button
                    className="relative block w-full aspect-square overflow-hidden bg-gray-100 hover:bg-gray-200 transition-colors"
                    onClick={() => setSelectedPhoto(photo)}
                  >
                    <img
                      src={photo.photo_thumbnail_url || photo.photo_url}
                      alt={photo.caption || '体験写真'}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 flex items-center justify-center">
                      <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                </DialogTrigger>

                <DialogContent className="max-w-4xl w-full">
                  {selectedPhoto && (
                    <div className="space-y-4">
                      <div className="relative">
                        <img
                          src={selectedPhoto.photo_url}
                          alt={selectedPhoto.caption || '体験写真'}
                          className="w-full max-h-[70vh] object-contain rounded-lg"
                        />
                        {selectedPhoto.is_primary && (
                          <Badge className="absolute top-3 left-3 bg-yellow-500 text-white">
                            <Star className="h-3 w-3 mr-1" />
                            メイン写真
                          </Badge>
                        )}
                      </div>

                      {selectedPhoto.caption && (
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-700">{selectedPhoto.caption}</p>
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(selectedPhoto.created_at)}
                        </div>
                        {selectedPhoto.file_size && (
                          <div>
                            {(selectedPhoto.file_size / (1024 * 1024)).toFixed(1)} MB
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>

              {photo.caption && (
                <div className="p-2 bg-white">
                  <p className="text-xs text-gray-600 line-clamp-2">{photo.caption}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}