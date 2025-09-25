'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createExperienceComment } from '@/lib/supabase/comments'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MessageSquarePlus, Star, CheckCircle, AlertCircle } from 'lucide-react'

interface CommentFormProps {
  experienceId: string
  parentCommentId?: string
  onCommentPosted?: () => void
  onCancel?: () => void
  className?: string
  placeholder?: string
  showRating?: boolean
  compact?: boolean
}

export default function CommentForm({
  experienceId,
  parentCommentId,
  onCommentPosted,
  onCancel,
  className = '',
  placeholder = 'この体験についてコメントを書く...',
  showRating = true,
  compact = false
}: CommentFormProps) {
  const [content, setContent] = useState('')
  const [rating, setRating] = useState<number | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('')

  const supabase = createClient()

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!content.trim()) {
      setMessage('コメント内容を入力してください')
      setMessageType('error')
      return
    }

    setIsSubmitting(true)
    setMessage('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('ログインが必要です')
      }

      const { error } = await createExperienceComment(
        experienceId,
        user.id,
        {
          content: content.trim(),
          rating: rating,
          parent_comment_id: parentCommentId
        }
      )

      if (error) {
        throw new Error(error)
      }

      setMessage(parentCommentId ? '返信を投稿しました！' : 'コメントを投稿しました！')
      setMessageType('success')
      setContent('')
      setRating(undefined)

      onCommentPosted?.()

      // 成功メッセージを3秒後にクリア
      setTimeout(() => {
        setMessage('')
        setMessageType('')
      }, 3000)

    } catch (error) {
      console.error('コメント投稿エラー:', error)
      setMessage(error instanceof Error ? error.message : 'コメントの投稿に失敗しました')
      setMessageType('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setContent('')
    setRating(undefined)
    setMessage('')
    setMessageType('')
    onCancel?.()
  }

  if (compact) {
    return (
      <div className={`space-y-3 ${className}`}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={placeholder}
            className="text-sm"
            rows={3}
            disabled={isSubmitting}
          />

          {showRating && !parentCommentId && (
            <div className="flex items-center gap-2">
              <Label className="text-xs">評価（任意）:</Label>
              <Select value={rating?.toString()} onValueChange={(value) => setRating(Number(value))}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue placeholder="選択" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <SelectItem key={star} value={star.toString()} className="text-xs">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        {star}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              size="sm"
              className="text-xs"
            >
              {isSubmitting ? (
                <>
                  <MessageSquarePlus className="h-3 w-3 mr-1 animate-spin" />
                  投稿中...
                </>
              ) : (
                <>
                  <MessageSquarePlus className="h-3 w-3 mr-1" />
                  {parentCommentId ? '返信' : 'コメント'}
                </>
              )}
            </Button>

            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                size="sm"
                className="text-xs"
                disabled={isSubmitting}
              >
                キャンセル
              </Button>
            )}
          </div>
        </form>

        {message && (
          <div className={`flex items-center gap-2 p-2 rounded text-xs ${
            messageType === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {messageType === 'success' ? (
              <CheckCircle className="h-3 w-3" />
            ) : (
              <AlertCircle className="h-3 w-3" />
            )}
            {message}
          </div>
        )}
      </div>
    )
  }

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquarePlus className="h-5 w-5" />
          {parentCommentId ? '返信を投稿' : 'コメントを投稿'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="comment-content" className="text-sm font-medium">
              コメント
            </Label>
            <Textarea
              id="comment-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={placeholder}
              className="mt-1"
              rows={4}
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500 mt-1">
              {content.length}/1000文字
            </p>
          </div>

          {showRating && !parentCommentId && (
            <div>
              <Label className="text-sm font-medium">評価（任意）</Label>
              <Select value={rating?.toString()} onValueChange={(value) => setRating(Number(value))}>
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="この体験の評価を選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <SelectItem key={star} value={star.toString()}>
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < star ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span>{star}つ星</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {message && (
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
              {message}
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <MessageSquarePlus className="h-4 w-4 mr-2 animate-spin" />
                  投稿中...
                </>
              ) : (
                <>
                  <MessageSquarePlus className="h-4 w-4 mr-2" />
                  {parentCommentId ? '返信を投稿' : 'コメントを投稿'}
                </>
              )}
            </Button>

            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                キャンセル
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}