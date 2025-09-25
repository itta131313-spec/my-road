import { createClient } from './client'
import { ExperiencePhoto, PhotoUploadData } from '../types/future-features'

const supabase = createClient()

// 体験の写真を取得
export async function getExperiencePhotos(experienceId: string): Promise<ExperiencePhoto[]> {
  const { data, error } = await supabase
    .from('experience_photos')
    .select('*')
    .eq('experience_id', experienceId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('写真取得エラー:', error)
    return []
  }

  return data || []
}

// 写真を投稿
export async function createExperiencePhoto(
  experienceId: string,
  userId: string,
  photoData: {
    photo_url: string
    photo_thumbnail_url?: string
    caption?: string
    file_size?: number
    mime_type?: string
    is_primary?: boolean
  }
): Promise<{ data?: ExperiencePhoto; error?: string }> {
  const { data, error } = await supabase
    .from('experience_photos')
    .insert([{
      experience_id: experienceId,
      user_id: userId,
      ...photoData
    }])
    .select()
    .single()

  if (error) {
    console.error('写真投稿エラー:', error)
    return { error: '写真の投稿に失敗しました' }
  }

  return { data }
}

// 写真を更新（キャプション、プライマリ設定など）
export async function updateExperiencePhoto(
  photoId: string,
  updates: {
    caption?: string
    is_primary?: boolean
  }
): Promise<{ data?: ExperiencePhoto; error?: string }> {
  const { data, error } = await supabase
    .from('experience_photos')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', photoId)
    .select()
    .single()

  if (error) {
    console.error('写真更新エラー:', error)
    return { error: '写真の更新に失敗しました' }
  }

  return { data }
}

// 写真を削除
export async function deleteExperiencePhoto(photoId: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('experience_photos')
    .delete()
    .eq('id', photoId)

  if (error) {
    console.error('写真削除エラー:', error)
    return { success: false, error: '写真の削除に失敗しました' }
  }

  return { success: true }
}

// プライマリ写真を設定（他の写真のプライマリ設定を解除）
export async function setPrimaryPhoto(experienceId: string, photoId: string): Promise<{ success: boolean; error?: string }> {
  // トランザクション的な操作を行う
  try {
    // まず、該当体験の全写真のプライマリ設定を解除
    const { error: resetError } = await supabase
      .from('experience_photos')
      .update({ is_primary: false })
      .eq('experience_id', experienceId)

    if (resetError) {
      console.error('プライマリリセットエラー:', resetError)
      return { success: false, error: 'プライマリ写真の設定に失敗しました' }
    }

    // 指定された写真をプライマリに設定
    const { error: setPrimaryError } = await supabase
      .from('experience_photos')
      .update({ is_primary: true, updated_at: new Date().toISOString() })
      .eq('id', photoId)

    if (setPrimaryError) {
      console.error('プライマリ設定エラー:', setPrimaryError)
      return { success: false, error: 'プライマリ写真の設定に失敗しました' }
    }

    return { success: true }
  } catch (error) {
    console.error('予期しないエラー:', error)
    return { success: false, error: '予期しないエラーが発生しました' }
  }
}

// ユーザーの写真一覧を取得（プロフィールページ用など）
export async function getUserPhotos(userId: string, limit: number = 20): Promise<ExperiencePhoto[]> {
  const { data, error } = await supabase
    .from('experience_photos')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('ユーザー写真取得エラー:', error)
    return []
  }

  return data || []
}