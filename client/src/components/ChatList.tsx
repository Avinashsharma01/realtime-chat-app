// ============================================================================
// ChatList Component (Sidebar)
// ============================================================================
// Displays the sidebar with:
//   1. Header with "New Chat", "New Group", and "Logout" buttons
//   2. Either: list of existing chats (1-on-1 + groups), OR user list for new chats
//
// Group chats show a purple avatar with the group name.
// 1-on-1 chats show a blue avatar with the other user's name.
// ============================================================================

import { useState } from 'react';
import type { Chat, User } from '../types';

interface ChatListProps {
  chats: Chat[];
  users: User[];
  selectedChat: Chat | null;
  currentUserId: string;
  onlineUsers: string[];
  onSelectChat: (chat: Chat) => void;
  onStartChat: (userId: string) => void;
  onCreateGroup: () => void;
  onProfile: () => void;
  onLogout: () => void;
}

export const ChatList = ({
  chats,
  users,
  selectedChat,
  currentUserId,
  onlineUsers,
  onSelectChat,
  onStartChat,
  onCreateGroup,
  onProfile,
  onLogout,
}: ChatListProps) => {
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // ── Helper: Get the other participant in a 1-on-1 chat ──────────────────
  const getOtherParticipant = (chat: Chat): User | undefined => {
    return chat.participants.find((p) => p.userId !== currentUserId)?.user;
  };

  // ── Helper: Get display name for a chat ─────────────────────────────────
  const getChatDisplayName = (chat: Chat): string => {
    if (chat.isGroup) return chat.name || 'Unnamed Group';
    const other = getOtherParticipant(chat);
    return other?.username || 'Unknown';
  };

  // ── Helper: Get avatar letter(s) ───────────────────────────────────────
  const getChatAvatar = (chat: Chat): string => {
    if (chat.isGroup) return (chat.name || 'G')[0].toUpperCase();
    const other = getOtherParticipant(chat);
    return other?.username?.[0]?.toUpperCase() || '?';
  };

  // ── Helper: Check if a 1-on-1 chat's other user is online ──────────────
  const isChatOnline = (chat: Chat): boolean => {
    if (chat.isGroup) {
      // Show green if at least one non-self member is online
      return chat.participants.some(
        (p) => p.userId !== currentUserId && onlineUsers.includes(p.userId),
      );
    }
    const other = getOtherParticipant(chat);
    return other ? onlineUsers.includes(other.id) : false;
  };

  // ── Helper: Get last message preview text ───────────────────────────────
  const getLastMessage = (chat: Chat): string => {
    if (chat.messages && chat.messages.length > 0) {
      const msg = chat.messages[0];
      const prefix = msg.senderId === currentUserId ? 'You: ' : '';
      const text = msg.content.substring(0, 35);
      return `${prefix}${text}${msg.content.length > 35 ? '...' : ''}`;
    }
    return 'No messages yet';
  };

  // ── Helper: Format timestamp ────────────────────────────────────────────
  const formatTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="w-full md:w-80 lg:w-96 bg-white border-r border-gray-200 flex flex-col h-dvh md:h-full">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="p-3 md:p-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h1 className="text-lg md:text-xl font-bold text-gray-800">Chats</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowNewChat(!showNewChat)}
              className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
            >
              {showNewChat ? 'Back' : '+ New'}
            </button>
            <button
              onClick={onProfile}
              className="p-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              title="Edit Profile"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </button>
            <button
              onClick={onLogout}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* ── New Chat / Group options ───────────────────────────────────────── */}
      {showNewChat ? (
        <div className="flex-1 overflow-y-auto">
          {/* Create Group Button */}
          <div
            onClick={() => {
              onCreateGroup();
              setShowNewChat(false);
            }}
            className="p-3 md:p-4 hover:bg-purple-50 cursor-pointer flex items-center gap-3 border-b border-gray-100 transition-colors"
          >
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-purple-700">New Group Chat</p>
              <p className="text-xs text-gray-400">Create a group conversation</p>
            </div>
          </div>

          {/* Divider */}
          <div className="px-4 py-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Start a 1-on-1 chat
            </p>
          </div>

          {/* Search input */}
          <div className="px-3 md:px-4 pb-2">
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* User list */}
          {filteredUsers.length === 0 ? (
            <p className="p-4 text-center text-sm text-gray-500">No users found</p>
          ) : (
            filteredUsers.map((user) => (
              <div
                key={user.id}
                onClick={() => {
                  onStartChat(user.id);
                  setShowNewChat(false);
                  setSearchQuery('');
                }}
                className="p-3 md:p-4 hover:bg-gray-50 cursor-pointer flex items-center gap-3 transition-colors"
              >
                <div className="relative shrink-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                    {user.username[0].toUpperCase()}
                  </div>
                  {onlineUsers.includes(user.id) && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-800 truncate">{user.username}</p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* ── Existing Chat List ────────────────────────────────────────────── */
        <div className="flex-1 overflow-y-auto">
          {chats.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-gray-500 text-sm">No chats yet</p>
              <p className="text-gray-400 text-xs mt-1">
                Click "+ New" to start a conversation
              </p>
            </div>
          ) : (
            chats.map((chat) => {
              const isSelected = selectedChat?.id === chat.id;
              const isOnline = isChatOnline(chat);
              const displayName = getChatDisplayName(chat);
              const avatarLetter = getChatAvatar(chat);

              return (
                <div
                  key={chat.id}
                  onClick={() => onSelectChat(chat)}
                  className={`p-3 md:p-4 cursor-pointer flex items-center gap-3 border-b border-gray-50 transition-colors ${
                    isSelected
                      ? 'bg-blue-50 border-l-4 border-l-blue-500'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {/* Avatar — purple for groups, blue for 1-on-1 */}
                  <div className="relative shrink-0">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold text-lg ${
                        chat.isGroup
                          ? 'bg-purple-100 text-purple-600'
                          : 'bg-blue-100 text-blue-600'
                      }`}
                    >
                      {avatarLetter}
                    </div>
                    {isOnline && (
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>

                  {/* Chat info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="font-medium text-gray-800 truncate">
                          {displayName}
                        </p>
                        {chat.isGroup && (
                          <span className="shrink-0 text-[10px] font-medium text-purple-500 bg-purple-50 px-1.5 py-0.5 rounded">
                            Group
                          </span>
                        )}
                      </div>
                      {chat.messages?.[0]?.createdAt && (
                        <span className="text-xs text-gray-400 ml-2 shrink-0">
                          {formatTime(chat.messages[0].createdAt)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate mt-0.5">
                      {getLastMessage(chat)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
