import { createClient } from './client'

const supabase = createClient()

export async function uploadExperiencePhoto(
  experienceId: string,
  file: File,
  userId: string
): Promise<{ url?: string; error?: string }> {
  try {
    // ファイル名を生成（タイムスタンプ + ランダム文字列で重複を避ける）
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileExt = file.name.split('.').pop()
    const fileName = `${experienceId}/${userId}/${timestamp}_${randomString}.${fileExt}`

    // ファイルをアップロード
    const { data, error } = await supabase.storage
      .from('experience-photos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('アップロードエラー:', error)
      return { error: 'ファイルのアップロードに失敗しました' }
    }

    // 公開URLを取得
    const { data: { publicUrl } } = supabase.storage
      .from('experience-photos')
      .getPublicUrl(data.path)

    return { url: publicUrl }
  } catch (error) {
    console.error('予期しないエラー:', error)
    return { error: '予期しないエラーが発生しました' }
  }
}

export async function deleteExperiencePhoto(photoUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    // URLからファイルパスを抽出
    const url = new URL(photoUrl)
    const path = url.pathname.split('/').slice(-3).join('/')

    const { error } = await supabase.storage
      .from('experience-photos')
      .remove([path])

    if (error) {
      console.error('削除エラー:', error)
      return { success: false, error: 'ファイルの削除に失敗しました' }
    }

    return { success: true }
  } catch (error) {
    console.error('予期しないエラー:', error)
    return { success: false, error: '予期しないエラーが発生しました' }
  }
}

// サムネイル生成のためのユーティリティ
export function createThumbnail(file: File, maxWidth: number = 300, maxHeight: number = 300, quality: number = 0.8): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      // アスペクト比を維持しながらリサイズ
      const ratio = Math.min(maxWidth / img.width, maxHeight / img.height)
      const newWidth = img.width * ratio
      const newHeight = img.height * ratio

      canvas.width = newWidth
      canvas.height = newHeight

      // 画像を描画
      ctx?.drawImage(img, 0, 0, newWidth, newHeight)

      // Blobに変換
      canvas.toBlob((blob) => {
        if (blob) {
          const thumbnailFile = new File([blob], `thumb_${file.name}`, {
            type: 'image/jpeg'
          })
          resolve(thumbnailFile)
        } else {
          resolve(file) // サムネイル生成に失敗した場合は元のファイルを返す
        }
      }, 'image/jpeg', quality)
    }

    img.src = URL.createObjectURL(file)
  })
}

// 画像ファイルかどうかをチェック
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

// ファイルサイズをチェック（デフォルト: 5MB）
export function isFileSizeValid(file: File, maxSizeInMB: number = 5): boolean {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024
  return file.size <= maxSizeInBytes
}