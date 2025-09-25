'use client'

import { useState, useEffect } from 'react'
import { ExperienceComment } from '@/lib/types/future-features'
import { getExperienceComments, deleteExperienceComment, updateExperienceComment } from '@/lib/supabase/comments'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import CommentForm from './comment-form'
import {
  MessageSquare,
  Reply,
  MoreHorizontal,
  Edit,
  Trash2,
  Star,
  AlertCircle,
  User,
  Calendar,
  Check,
  X
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Textarea } from '@/components/ui/textarea'

interface CommentListProps {
  experienceId: string
  className?: string
}

export default function CommentList({
  experienceId,
  className = ''
}: CommentListProps) {
  const [comments, setComments] = useState<ExperienceComment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [actionLoading, setActionLoading] = useState<string>('')

  const supabase = createClient()

  useEffect(() => {
    loadComments()
    loadCurrentUser()
  }, [experienceId])

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUser(user)
  }

  const loadComments = async () => {
    try {
      setLoading(true)
      const commentsData = await getExperienceComments(experienceId)
      setComments(commentsData)
      setError('')
    } catch (err) {
      console.error('コメント読み込みエラー:', err)
      setError('コメントの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleCommentPosted = () => {
    loadComments()
    setReplyingTo(null)
  }

  const handleEditStart = (comment: ExperienceComment) => {
    setEditingComment(comment.id)
    setEditContent(comment.content)
  }

  const handleEditCancel = () => {
    setEditingComment(null)
    setEditContent('')
  }

  const handleEditSave = async (commentId: string) => {
    if (!editContent.trim()) {
      return
    }

    try {
      setActionLoading(commentId)
      const { error } = await updateExperienceComment(commentId, {
        content: editContent.trim()
      })

      if (error) {
        throw new Error(error)
      }

      await loadComments()
      setEditingComment(null)
      setEditContent('')
    } catch (err) {
      console.error('コメント更新エラー:', err)
      setError('コメントの更新に失敗しました')
    } finally {
      setActionLoading('')
    }
  }

  const handleDelete = async (commentId: string) => {
    if (!confirm('このコメントを削除しますか？この操作は取り消せません。')) {
      return
    }

    try {
      setActionLoading(commentId)
      const { success, error } = await deleteExperienceComment(commentId)

      if (!success) {
        throw new Error(error)
      }

      await loadComments()
    } catch (err) {
      console.error('コメント削除エラー:', err)
      setError('コメントの削除に失敗しました')
    } finally {
      setActionLoading('')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const renderComment = (comment: ExperienceComment, isReply: boolean = false) => {
    const isOwner = currentUser?.id === comment.user_id
    const isEditing = editingComment === comment.id

    return (
      <div key={comment.id} className={`${isReply ? 'ml-8 border-l-2 border-gray-200 pl-4' : ''}`}>
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-gray-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {comment.user_profile?.display_name || '匿名ユーザー'}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar className="h-3 w-3" />
                    {formatDate(comment.created_at)}
                    {comment.is_edited && (
                      <Badge variant="outline" className="text-xs px-1 py-0">
                        編集済み
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {comment.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium">{comment.rating}</span>
                  </div>
                )}

                {isOwner && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        disabled={actionLoading === comment.id}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditStart(comment)}>
                        <Edit className="h-4 w-4 mr-2" />
                        編集
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDelete(comment.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        削除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>

            {isEditing ? (
              <div className="space-y-3">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="text-sm"
                  rows={3}
                />
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => handleEditSave(comment.id)}
                    size="sm"
                    disabled={!editContent.trim() || actionLoading === comment.id}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    保存
                  </Button>
                  <Button
                    onClick={handleEditCancel}
                    variant="outline"
                    size="sm"
                  >
                    <X className="h-3 w-3 mr-1" />
                    キャンセル
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">
                  {comment.content}
                </p>

                {!isReply && (
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setReplyingTo(comment.id)}
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                    >
                      <Reply className="h-3 w-3 mr-1" />
                      返信
                    </Button>
                    {comment.replies && comment.replies.length > 0 && (
                      <span className="text-xs text-gray-500">
                        {comment.replies.length}件の返信
                      </span>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* 返信フォーム */}
        {replyingTo === comment.id && (
          <div className="ml-8 mb-4">
            <CommentForm
              experienceId={experienceId}
              parentCommentId={comment.id}
              onCommentPosted={handleCommentPosted}
              onCancel={() => setReplyingTo(null)}
              placeholder="返信を書く..."
              showRating={false}
              compact={true}
            />
          </div>
        )}

        {/* 返信表示 */}
        {comment.replies?.map((reply) => renderComment(reply, true))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse">
          {[1, 2, 3].map(i => (
            <Card key={i} className="mb-4">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                  <div className="space-y-1">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
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
          onClick={loadComments}
          variant="outline"
          size="sm"
          className="ml-auto"
        >
          再試行
        </Button>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          コメント ({comments.length}件)
        </h3>
      </div>

      {comments.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p>まだコメントが投稿されていません</p>
            <p className="text-sm text-gray-400 mt-2">
              最初のコメントを投稿してみましょう
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {comments.map(comment => renderComment(comment))}
        </div>
      )}
    </div>
  )
}