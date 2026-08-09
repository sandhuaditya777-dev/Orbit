'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, Pencil, Trash2, Check, X } from 'lucide-react';
import { useComments, useCreateComment, useUpdateComment, useDeleteComment } from '@/api/comments';
import { useSocketEvent } from '@/hooks/useSocket';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import type { Comment } from '@/api/types';

interface Props {
  taskId: string;
  projectId: string;
  workspaceId: string;
  memberMap: Record<string, { name: string; avatar: string }>;
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

interface CommentItemProps {
  comment: Comment;
  isOwnComment: boolean;
  memberMap: Record<string, { name: string; avatar: string }>;
  onUpdate: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  isUpdating: boolean;
  isDeleting: boolean;
}

const CommentItem = React.memo(
  ({ comment, isOwnComment, memberMap, onUpdate, onDelete, isUpdating, isDeleting }: CommentItemProps) => {
    const [editing, setEditing] = useState(false);
    const [editContent, setEditContent] = useState(comment.content);
    const author = memberMap[comment.authorId];
    const name = author?.name ?? 'Unknown';
    const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

    const handleSave = () => {
      if (!editContent.trim()) return;
      onUpdate(comment._id, editContent.trim());
      setEditing(false);
    };

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="flex gap-3 group"
      >
        {/* Avatar */}
        <div className="flex-shrink-0">
          {author?.avatar ? (
            <img
              src={author.avatar}
              alt={name}
              className="h-7 w-7 rounded-full object-cover ring-1 ring-gray-200"
            />
          ) : (
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-[10px] font-bold text-white ring-1 ring-gray-200">
              {initials}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-gray-800">{name}</span>
            <span className="text-[10px] text-gray-400">{formatTime(comment.createdAt)}</span>
            {comment.isEdited && (
              <span className="text-[10px] text-gray-400 italic">(edited)</span>
            )}
          </div>

          {editing ? (
            <div className="flex flex-col gap-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 resize-none focus:outline-none focus:ring-1 focus:ring-amber-400 min-h-[60px]"
                autoFocus
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  disabled={isUpdating}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Check className="h-3 w-3" /> Save
                </button>
                <button
                  onClick={() => { setEditing(false); setEditContent(comment.content); }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <X className="h-3 w-3" /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <p className="text-sm text-gray-700 leading-relaxed flex-1 whitespace-pre-wrap break-words">
                {comment.content}
              </p>
              {isOwnComment && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 pt-0.5">
                  <button
                    onClick={() => setEditing(true)}
                    className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                    title="Edit"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => onDelete(comment._id)}
                    disabled={isDeleting}
                    className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors cursor-pointer disabled:opacity-50"
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    );
  },
);
CommentItem.displayName = 'CommentItem';

// ── Main Component ─────────────────────────────────────────────────────────────

export default function CommentThread({ taskId, projectId, workspaceId, memberMap }: Props) {
  const { user } = useAuthStore();
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading } = useComments(taskId);
  const createComment = useCreateComment();
  const updateComment = useUpdateComment();
  const deleteComment = useDeleteComment();

  // Realtime: new comment from other users
  const handleCommentCreated = useCallback(
    (comment: Comment) => {
      if (comment.taskId !== taskId) return;
      queryClient.setQueryData<Comment[]>(['comments', taskId], (old = []) => {
        if (old.some((c) => c._id === comment._id)) return old;
        return [...old, comment];
      });
    },
    [taskId, queryClient],
  );

  const handleCommentUpdated = useCallback(
    (comment: Comment) => {
      if (comment.taskId !== taskId) return;
      queryClient.setQueryData<Comment[]>(['comments', taskId], (old = []) =>
        old.map((c) => (c._id === comment._id ? comment : c)),
      );
    },
    [taskId, queryClient],
  );

  const handleCommentDeleted = useCallback(
    (data: { _id: string; taskId: string }) => {
      if (data.taskId !== taskId) return;
      queryClient.setQueryData<Comment[]>(['comments', taskId], (old = []) =>
        old.filter((c) => c._id !== data._id),
      );
    },
    [taskId, queryClient],
  );

  useSocketEvent<Comment>('comment:created', handleCommentCreated);
  useSocketEvent<Comment>('comment:updated', handleCommentUpdated);
  useSocketEvent<{ _id: string; taskId: string }>('comment:deleted', handleCommentDeleted);

  // Scroll to bottom when new comments arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || createComment.isPending) return;
    createComment.mutate({ taskId, projectId, workspaceId, content: trimmed });
    setContent('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest text-left">
        Comments ({comments.length})
      </h4>

      {/* Comment list */}
      <div className="flex flex-col gap-4 max-h-64 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          <AnimatePresence initial={false}>
            {comments.map((c) => (
              <CommentItem
                key={c._id}
                comment={c}
                isOwnComment={c.authorId === user?.sub}
                memberMap={memberMap}
                onUpdate={(id, newContent) =>
                  updateComment.mutate({ id, taskId: c.taskId, content: newContent })
                }
                onDelete={(id) => deleteComment.mutate({ id, taskId: c.taskId })}
                isUpdating={updateComment.isPending}
                isDeleting={deleteComment.isPending}
              />
            ))}
          </AnimatePresence>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a comment… (Enter to send, Shift+Enter for newline)"
          rows={2}
          className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-1 focus:ring-amber-400 focus:border-amber-400 transition-all shadow-sm"
        />
        <button
          type="submit"
          disabled={!content.trim() || createComment.isPending}
          className="flex-shrink-0 p-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
        >
          {createComment.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </form>
    </div>
  );
}
