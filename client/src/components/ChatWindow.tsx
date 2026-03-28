// ============================================================================
// ChatWindow Component
// ============================================================================
// The main chat area — handles BOTH 1-on-1 and group chats.
// Shows:
//   1. Header (user avatar + name for 1-on-1, group name + member count for groups)
//   2. Messages list with sender labels for groups
//   3. Typing indicator
//   4. Message input
//
// Group-specific features:
//   - "Info" button in header opens GroupInfoPanel
//   - Shows sender username on each message
//   - Broadcasts typing to all group members via rooms
// ============================================================================

import { useState, useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import type { Chat, Message } from '../types';
import type { Socket } from 'socket.io-client';

interface ChatWindowProps {
  chat: Chat;
  messages: Message[];
  currentUserId: string;
  onlineUsers: string[];
  onSendMessage: (content: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  socket: Socket | null;
  showBackButton?: boolean;
  onBack?: () => void;
  onOpenGroupInfo?: () => void;
}

export const ChatWindow = ({
  chat,
  messages,
  currentUserId,
  onlineUsers,
  onSendMessage,
  onDeleteMessage,
  socket,
  showBackButton = false,
  onBack,
  onOpenGroupInfo,
}: ChatWindowProps) => {
  const [inputValue, setInputValue] = useState('');
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // ── Determine header details (1-on-1 vs group) ─────────────────────────
  const isGroup = chat.isGroup;

  // For 1-on-1 chats
  const otherParticipant = isGroup
    ? undefined
    : chat.participants.find((p) => p.userId !== currentUserId)?.user;

  const isOnline = isGroup
    ? chat.participants.some(
        (p) => p.userId !== currentUserId && onlineUsers.includes(p.userId),
      )
    : otherParticipant
      ? onlineUsers.includes(otherParticipant.id)
      : false;

  const headerName = isGroup
    ? chat.name || 'Unnamed Group'
    : otherParticipant?.username || 'Unknown';

  const headerSubtext = isGroup
    ? `${chat.participants.length} members`
    : isOnline
      ? 'Online'
      : 'Offline';

  // ── Auto-scroll ────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Typing events ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const handleTypingStart = ({
      chatId,
      userId,
      username,
    }: {
      chatId: string;
      userId: string;
      username?: string;
    }) => {
      if (chatId === chat.id && userId !== currentUserId) {
        setTypingUsers((prev) => {
          const next = new Map(prev);
          next.set(userId, username || 'Someone');
          return next;
        });
      }
    };

    const handleTypingStop = ({
      chatId,
      userId,
    }: {
      chatId: string;
      userId: string;
    }) => {
      if (chatId === chat.id && userId !== currentUserId) {
        setTypingUsers((prev) => {
          const next = new Map(prev);
          next.delete(userId);
          return next;
        });
      }
    };

    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);

    return () => {
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop', handleTypingStop);
    };
  }, [socket, chat.id, currentUserId]);

  // ── Emit typing indicators (debounced) ─────────────────────────────────
  const emitTypingStart = () => {
    if (!socket) return;
    if (isGroup) {
      socket.emit('typing:start', { chatId: chat.id, isGroup: true });
    } else if (otherParticipant) {
      socket.emit('typing:start', {
        chatId: chat.id,
        recipientId: otherParticipant.id,
      });
    }
  };

  const emitTypingStop = () => {
    if (!socket) return;
    if (isGroup) {
      socket.emit('typing:stop', { chatId: chat.id, isGroup: true });
    } else if (otherParticipant) {
      socket.emit('typing:stop', {
        chatId: chat.id,
        recipientId: otherParticipant.id,
      });
    }
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
    if (!socket) return;

    // Debounce: only emit typing:start once, not on every keystroke
    if (!isTyping) {
      setIsTyping(true);
      emitTypingStart();
    }

    // Reset the stop timeout
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setIsTyping(false);
      emitTypingStop();
    }, 2000);
  };

  // ── Submit message ────────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const content = inputValue.trim();
    if (!content) return;

    onSendMessage(content);
    setInputValue('');
    setShowEmojiPicker(false);
    setIsTyping(false);
    emitTypingStop();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  // ── Typing indicator text ─────────────────────────────────────────────
  const typingText = (() => {
    if (typingUsers.size === 0) return null;
    const names = Array.from(typingUsers.values());
    if (names.length === 1) return `${names[0]} is typing...`;
    if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`;
    return `${names[0]} and ${names.length - 1} others are typing...`;
  })();

  // ── Emoji picker: common emojis ──────────────────────────────────────
  const EMOJI_LIST = [
    '😀', '😂', '😍', '🥰', '😎', '🤔', '😢', '😡',
    '👍', '👎', '❤️', '🔥', '🎉', '✅', '👋', '🙏',
    '😊', '😏', '🤗', '😴', '🤯', '😱', '🥳', '💪',
    '👏', '🤝', '💯', '⭐', '🌟', '✨', '💬', '📝',
  ];

  const handleEmojiSelect = (emoji: string) => {
    setInputValue((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  // Close emoji picker on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  return (
    <div className="flex-1 flex flex-col h-dvh md:h-full">
      {/* ── Chat Header ──────────────────────────────────────────────────── */}
      <div className="p-3 md:p-4 bg-white border-b border-gray-200 flex items-center gap-3 shadow-sm">
        {showBackButton && (
          <button
            type="button"
            onClick={onBack}
            className="shrink-0 rounded-md p-2 text-gray-600 hover:bg-gray-100"
            aria-label="Back to chats"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Avatar */}
        <div className="relative">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
              isGroup
                ? 'bg-purple-100 text-purple-600'
                : 'bg-blue-100 text-blue-600'
            }`}
          >
            {isGroup
              ? (chat.name || 'G')[0].toUpperCase()
              : otherParticipant?.username?.[0]?.toUpperCase() || '?'}
          </div>
          {isOnline && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
          )}
        </div>

        {/* Name & status */}
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-gray-800 truncate">{headerName}</h2>
          <p
            className={`text-xs ${
              isGroup
                ? 'text-gray-400'
                : isOnline
                  ? 'text-green-500'
                  : 'text-gray-400'
            }`}
          >
            {headerSubtext}
          </p>
        </div>

        {/* Group Info button */}
        {isGroup && onOpenGroupInfo && (
          <button
            onClick={onOpenGroupInfo}
            className="shrink-0 p-2 rounded-md hover:bg-gray-100 text-gray-500"
            title="Group Info"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Messages Area ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-3 md:p-4 bg-gray-50 space-y-3">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400 text-sm">
              {isGroup ? 'No messages yet. Start the group conversation!' : 'No messages yet. Say hello! 👋'}
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.senderId === currentUserId}
              showSenderName={isGroup}
              onDelete={
                message.senderId === currentUserId && !message.deletedAt && onDeleteMessage
                  ? () => onDeleteMessage(message.id)
                  : undefined
              }
            />
          ))
        )}

        {/* Typing indicator */}
        {typingText && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
            </div>
            <span>{typingText}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Message Input ────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="p-3 md:p-4 bg-white border-t border-gray-200">
        <div className="flex gap-2 items-center">
          {/* Emoji picker button */}
          <div className="relative" ref={emojiPickerRef}>
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2.5 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
              title="Add emoji"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            {/* Emoji grid */}
            {showEmojiPicker && (
              <div className="absolute bottom-12 left-0 bg-white border border-gray-200 rounded-xl shadow-xl p-3 w-72 z-50">
                <div className="grid grid-cols-8 gap-1">
                  {EMOJI_LIST.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleEmojiSelect(emoji)}
                      className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-lg transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <input
            type="text"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="px-4 md:px-6 py-2.5 bg-blue-500 text-white rounded-full text-sm font-medium hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};
