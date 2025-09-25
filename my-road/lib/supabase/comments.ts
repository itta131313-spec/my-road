import { createClient } from './client'
import { ExperienceComment, CommentPostData } from '../types/future-features'

const supabase = createClient()

// 体験のコメントを取得（階層構造で）
export async function getExperienceComments(experienceId: string): Promise<ExperienceComment[]> {
  const { data, error } = await supabase
    .from('experience_comments')
    .select(`
      *,
      user_profile:user_id (
        display_name
      )
    `)
    .eq('experience_id', experienceId)
    .is('parent_comment_id', null) // トップレベルのコメントのみ
    .order('created_at', { ascending: false })

  if (error) {
    console.error('コメント取得エラー:', error)
    return []
  }

  // 各トップレベルコメントに対して返信を取得
  const commentsWithReplies = await Promise.all(
    (data || []).map(async (comment) => {
      const replies = await getCommentReplies(comment.id)
      return {
        ...comment,
        replies
      }
    })
  )

  return commentsWithReplies
}

// コメントの返信を取得
export async function getCommentReplies(parentCommentId: string): Promise<ExperienceComment[]> {
  const { data, error } = await supabase
    .from('experience_comments')
    .select(`
      *,
      user_profile:user_id (
        display_name
      )
    `)
    .eq('parent_comment_id', parentCommentId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('返信取得エラー:', error)
    return []
  }

  return data || []
}

// コメントを投稿
export async function createExperienceComment(
  experienceId: string,
  userId: string,
  commentData: CommentPostData
): Promise<{ data?: ExperienceComment; error?: string }> {
  const { data, error } = await supabase
    .from('experience_comments')
    .insert([{
      experience_id: experienceId,
      user_id: userId,
      content: commentData.content,
      rating: commentData.rating,
      parent_comment_id: commentData.parent_comment_id
    }])
    .select(`
      *,
      user_profile:user_id (
        display_name
      )
    `)
    .single()

  if (error) {
    console.error('コメント投稿エラー:', error)
    return { error: 'コメントの投稿に失敗しました' }
  }

  return { data }
}

// コメントを更新
export async function updateExperienceComment(
  commentId: string,
  updates: {
    content?: string
    rating?: number
  }
): Promise<{ data?: ExperienceComment; error?: string }> {
  const { data, error } = await supabase
    .from('experience_comments')
    .update({
      ...updates,
      is_edited: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', commentId)
    .select(`
      *,
      user_profile:user_id (
        display_name
      )
    `)
    .single()

  if (error) {
    console.error('コメント更新エラー:', error)
    return { error: 'コメントの更新に失敗しました' }
  }

  return { data }
}

// コメントを削除
export async function deleteExperienceComment(commentId: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('experience_comments')
    .delete()
    .eq('id', commentId)

  if (error) {
    console.error('コメント削除エラー:', error)
    return { success: false, error: 'コメントの削除に失敗しました' }
  }

  return { success: true }
}

// コメント数を取得
export async function getCommentsCount(experienceId: string): Promise<number> {
  const { count, error } = await supabase
    .from('experience_comments')
    .select('*', { count: 'exact', head: true })
    .eq('experience_id', experienceId)

  if (error) {
    console.error('コメント数取得エラー:', error)
    return 0
  }

  return count || 0
}

// ユーザーのコメント一覧を取得（プロフィールページ用など）
export async function getUserComments(userId: string, limit: number = 20): Promise<ExperienceComment[]> {
  const { data, error } = await supabase
    .from('experience_comments')
    .select(`
      *,
      experience:experience_id (
        category,
        address
      )
    `)
    .eq('user_id', userId)
    .is('parent_comment_id', null) // トップレベルのコメントのみ
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('ユーザーコメント取得エラー:', error)
    return []
  }

  return data || []
}