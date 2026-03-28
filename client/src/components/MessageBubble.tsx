// ============================================================================
// MessageBubble Component
// ============================================================================
// Renders a single chat message as a "bubble".
// - Own messages: blue, aligned right
// - Others' messages: white, aligned left
// For group chats, shows the sender name on received messages.
// Supports soft-deleted messages and delete-on-hover for own messages.
// ============================================================================

import { useState } from 'react';
import type { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showSenderName?: boolean; // true in group chats
  onDelete?: () => void;    // callback to delete this message
}

export const MessageBubble = ({ message, isOwn, showSenderName = false, onDelete }: MessageBubbleProps) => {
  const [hovered, setHovered] = useState(false);
  const isDeleted = !!message.deletedAt;

  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Delete button (own non-deleted messages only, shown on hover) */}
      {isOwn && !isDeleted && onDelete && hovered && (
        <button
          onClick={onDelete}
          className="self-center mr-1 p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          title="Delete message"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}

      <div
        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
          isDeleted
            ? 'bg-gray-100 text-gray-400 border border-gray-200 rounded-br-sm'
            : isOwn
              ? 'bg-blue-500 text-white rounded-br-sm'
              : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm'
        }`}
      >
        {/* Show sender name for received messages (always in group, optional in 1-on-1) */}
        {!isOwn && showSenderName && !isDeleted && (
          <p className="text-xs font-semibold text-blue-600 mb-1">
            {message.sender?.username}
          </p>
        )}

        {/* Message text */}
        {isDeleted ? (
          <p className="text-sm italic">🚫 This message was deleted</p>
        ) : (
          <p className="wrap-break-word text-sm">{message.content}</p>
        )}

        {/* Timestamp */}
        <p
          className={`text-xs mt-1 ${
            isDeleted ? 'text-gray-300' : isOwn ? 'text-blue-100' : 'text-gray-400'
          }`}
        >
          {time}
        </p>
      </div>
    </div>
  );
};
