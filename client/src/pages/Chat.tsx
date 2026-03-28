// ============================================================================
// Chat Page (Main Application Page)
// ============================================================================
// This is the main page users see after logging in. It contains:
//   - ChatList sidebar (left) — shows all conversations (1-on-1 + groups)
//   - ChatWindow (right) — shows messages for the selected chat
//   - CreateGroupModal — for creating new group chats
//   - GroupInfoPanel — slide-out panel for group management
//
// State management:
//   - Fetches chats and users on mount
//   - Listens for real-time messages via Socket.IO
//   - Updates chat list when new messages arrive
//   - Supports creating new 1-on-1 chats and group chats
//   - Group management: rename, add/remove members, admin, leave
//
// This component acts as the "orchestrator" — it manages the state
// and passes data/callbacks to child components.
// ============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { ChatList } from '../components/ChatList';
import { ChatWindow } from '../components/ChatWindow';
import { CreateGroupModal } from '../components/CreateGroupModal';
import { GroupInfoPanel } from '../components/GroupInfoPanel';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ProfileModal } from '../components/ProfileModal';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { chatService } from '../services/chat.service';
import { messageService } from '../services/message.service';
import type { Chat as ChatType, Message, User } from '../types';
import api from '../services/api';

export const Chat = () => {
  const { user, logout } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const { showToast } = useToast();

  // ── State ─────────────────────────────────────────────────────────────────
  const [chats, setChats] = useState<ChatType[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatType | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768);

  // Group-specific UI state
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
  } | null>(null);

  // Notification sound ref
  const notificationSoundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create a notification sound using Web Audio API (no external file needed)
    const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    notificationSoundRef.current = null;

    // We'll use the AudioContext directly for notification
    (notificationSoundRef as unknown as { current: AudioContext }).current = audioCtx;
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ── Fetch chats and users on mount ────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fetchedChats, usersResponse] = await Promise.all([
          chatService.getChats(),
          api.get<{ users: User[] }>('/users'),
        ]);

        setChats(fetchedChats);
        setUsers(usersResponse.data.users);
      } catch (error) {
        console.error('Failed to fetch initial data:', error);
        showToast('Failed to load chats. Please refresh the page.', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ── Fetch messages when selecting a chat ──────────────────────────────────
  useEffect(() => {
    if (!selectedChat) return;

    const fetchMessages = async () => {
      try {
        const result = await messageService.getMessages(selectedChat.id);
        setMessages(result.messages);
      } catch (error) {
        console.error('Failed to fetch messages:', error);
        showToast('Failed to load messages.', 'error');
      }
    };

    fetchMessages();
  }, [selectedChat?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Join group room when selecting a group chat ───────────────────────────
  useEffect(() => {
    if (!socket || !selectedChat?.isGroup) return;
    socket.emit('group:join', selectedChat.id);
  }, [socket, selectedChat?.id, selectedChat?.isGroup]);

  // ── Listen for real-time messages ─────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const playNotificationSound = () => {
      try {
        const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.3);
      } catch {
        // Audio not available — silently ignore
      }
    };

    const handleNewMessage = (message: Message) => {
      // Add message to current chat's list (avoid duplicates)
      if (selectedChat && message.chatId === selectedChat.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
      }

      // Play notification sound for messages from others
      if (message.senderId !== user?.id) {
        playNotificationSound();
      }

      // Update chat list to show latest message preview
      setChats((prev) =>
        prev
          .map((chat) => {
            if (chat.id === message.chatId) {
              return {
                ...chat,
                messages: [message],
                updatedAt: message.createdAt,
              };
            }
            return chat;
          })
          .sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
          ),
      );
    };

    const handleMessageDeleted = ({ messageId }: { messageId: string; chatId: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, content: 'This message was deleted', deletedAt: new Date().toISOString() }
            : m,
        ),
      );
    };

    socket.on('message:receive', handleNewMessage);
    socket.on('message:deleted', handleMessageDeleted);
    return () => {
      socket.off('message:receive', handleNewMessage);
      socket.off('message:deleted', handleMessageDeleted);
    };
  }, [socket, selectedChat?.id, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Send message handler (1-on-1 and group) ──────────────────────────────
  const handleSendMessage = useCallback(
    (content: string) => {
      if (!selectedChat || !socket || !user) return;

      if (selectedChat.isGroup) {
        // Group message: broadcast to room
        socket.emit('message:send', {
          chatId: selectedChat.id,
          content,
          isGroup: true,
        });
      } else {
        // 1-on-1 message: send to specific recipient
        const otherParticipant = selectedChat.participants.find(
          (p) => p.userId !== user.id,
        );
        if (!otherParticipant) return;

        socket.emit('message:send', {
          chatId: selectedChat.id,
          content,
          recipientId: otherParticipant.userId,
        });
      }
    },
    [selectedChat, socket, user],
  );

  // ── Start new 1-on-1 chat ────────────────────────────────────────────────
  const handleStartChat = async (participantId: string) => {
    try {
      const chat = await chatService.createChat(participantId);
      setChats((prev) => {
        if (prev.some((c) => c.id === chat.id)) return prev;
        return [chat, ...prev];
      });
      setSelectedChat(chat);
    } catch (error) {
      console.error('Failed to create chat:', error);
      showToast('Failed to start chat. Please try again.', 'error');
    }
  };

  // ── Create group chat ────────────────────────────────────────────────────
  const handleCreateGroup = async (name: string, participantIds: string[]) => {
    try {
      const chat = await chatService.createGroup(name, participantIds);
      setChats((prev) => [chat, ...prev]);
      setSelectedChat(chat);
      setShowCreateGroup(false);

      // Join the group room immediately
      if (socket) {
        socket.emit('group:join', chat.id);
      }
    } catch (error) {
      console.error('Failed to create group:', error);
      showToast('Failed to create group. Please try again.', 'error');
    }
  };

  // ── Rename group ─────────────────────────────────────────────────────────
  const handleRenameGroup = async (chatId: string, name: string) => {
    try {
      const updated = await chatService.renameGroup(chatId, name);
      setChats((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, name: updated.name } : c)),
      );
      if (selectedChat?.id === chatId) {
        setSelectedChat((prev) => (prev ? { ...prev, name: updated.name } : prev));
      }
    } catch (error) {
      console.error('Failed to rename group:', error);
      showToast('Failed to rename group.', 'error');
    }
  };

  // ── Add member to group ──────────────────────────────────────────────────
  const handleAddMember = async (chatId: string, userId: string) => {
    try {
      const updated = await chatService.addMember(chatId, userId);
      setChats((prev) =>
        prev.map((c) => (c.id === chatId ? updated : c)),
      );
      if (selectedChat?.id === chatId) {
        setSelectedChat(updated);
      }
    } catch (error) {
      console.error('Failed to add member:', error);
    }
  };

  // ── Remove member from group ─────────────────────────────────────────────
  const handleRemoveMember = async (chatId: string, userId: string) => {
    // Show confirmation dialog
    const targetUser = users.find((u) => u.id === userId);
    setConfirmDialog({
      title: 'Remove Member',
      message: `Are you sure you want to remove ${targetUser?.username || 'this user'} from the group?`,
      confirmLabel: 'Remove',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const result = await chatService.removeMember(chatId, userId);
          if (result.chat) {
            setChats((prev) =>
              prev.map((c) => (c.id === chatId ? result.chat! : c)),
            );
            if (selectedChat?.id === chatId) {
              setSelectedChat(result.chat);
            }
          }
          showToast('Member removed successfully.', 'success');
        } catch (error) {
          console.error('Failed to remove member:', error);
          showToast('Failed to remove member.', 'error');
        }
      },
    });
  };

  // ── Promote to admin ─────────────────────────────────────────────────────
  const handleMakeAdmin = async (chatId: string, userId: string) => {
    try {
      const updated = await chatService.makeAdmin(chatId, userId);
      setChats((prev) =>
        prev.map((c) => (c.id === chatId ? updated : c)),
      );
      if (selectedChat?.id === chatId) {
        setSelectedChat(updated);
      }
    } catch (error) {
      console.error('Failed to promote member:', error);
      showToast('Failed to promote member.', 'error');
    }
  };

  // ── Leave group ──────────────────────────────────────────────────────────
  const handleLeaveGroup = async (chatId: string) => {
    setConfirmDialog({
      title: 'Leave Group',
      message: 'Are you sure you want to leave this group? You will no longer receive messages from this group.',
      confirmLabel: 'Leave',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await chatService.leaveGroup(chatId);
          // Remove the group from the local chat list
          setChats((prev) => prev.filter((c) => c.id !== chatId));
          if (selectedChat?.id === chatId) {
            setSelectedChat(null);
            setShowGroupInfo(false);
          }
          showToast('You left the group.', 'info');
        } catch (error) {
          console.error('Failed to leave group:', error);
          showToast('Failed to leave group.', 'error');
        }
      },
    });
  };

  const handleSelectChat = (chat: ChatType) => {
    setSelectedChat(chat);
    setShowGroupInfo(false); // close group panel when switching chats
  };

  // ── Delete message ───────────────────────────────────────────────────────
  const handleDeleteMessage = useCallback(
    (messageId: string) => {
      if (!selectedChat || !socket || !user) return;

      setConfirmDialog({
        title: 'Delete Message',
        message: 'Are you sure you want to delete this message? This cannot be undone.',
        confirmLabel: 'Delete',
        onConfirm: () => {
          setConfirmDialog(null);

          if (selectedChat.isGroup) {
            socket.emit('message:delete', {
              messageId,
              chatId: selectedChat.id,
              isGroup: true,
            });
          } else {
            const otherParticipant = selectedChat.participants.find(
              (p) => p.userId !== user.id,
            );
            socket.emit('message:delete', {
              messageId,
              chatId: selectedChat.id,
              recipientId: otherParticipant?.userId,
            });
          }
        },
      });
    },
    [selectedChat, socket, user],
  );

  const handleBackToList = () => {
    setSelectedChat(null);
    setShowGroupInfo(false);
  };

  // ── Loading State ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading chats...</p>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-dvh bg-gray-100">
      {isMobile ? (
        selectedChat ? (
          <div className="flex w-full">
            <ChatWindow
              key={selectedChat.id}
              chat={selectedChat}
              messages={messages}
              currentUserId={user!.id}
              onlineUsers={onlineUsers}
              onSendMessage={handleSendMessage}
              onDeleteMessage={handleDeleteMessage}
              socket={socket}
              showBackButton
              onBack={handleBackToList}
              onOpenGroupInfo={
                selectedChat.isGroup
                  ? () => setShowGroupInfo(true)
                  : undefined
              }
            />

            {/* Group Info Panel (mobile overlay) */}
            {showGroupInfo && selectedChat.isGroup && (
              <div className="fixed inset-0 z-50 flex">
                <div
                  className="absolute inset-0 bg-black/30"
                  onClick={() => setShowGroupInfo(false)}
                />
                <div className="relative ml-auto w-80 max-w-full animate-slide-in">
                  <GroupInfoPanel
                    chat={selectedChat}
                    currentUserId={user!.id}
                    allUsers={users}
                    onlineUsers={onlineUsers}
                    onClose={() => setShowGroupInfo(false)}
                    onRenameGroup={handleRenameGroup}
                    onAddMember={handleAddMember}
                    onRemoveMember={handleRemoveMember}
                    onMakeAdmin={handleMakeAdmin}
                    onLeaveGroup={handleLeaveGroup}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <ChatList
            chats={chats}
            users={users}
            selectedChat={selectedChat}
            currentUserId={user!.id}
            onlineUsers={onlineUsers}
            onSelectChat={handleSelectChat}
            onStartChat={handleStartChat}
            onCreateGroup={() => setShowCreateGroup(true)}
            onProfile={() => setShowProfile(true)}
            onLogout={logout}
          />
        )
      ) : (
        <>
          <ChatList
            chats={chats}
            users={users}
            selectedChat={selectedChat}
            currentUserId={user!.id}
            onlineUsers={onlineUsers}
            onSelectChat={handleSelectChat}
            onStartChat={handleStartChat}
            onCreateGroup={() => setShowCreateGroup(true)}
            onProfile={() => setShowProfile(true)}
            onLogout={logout}
          />

          {selectedChat ? (
            <div className="flex flex-1 min-w-0">
              <ChatWindow
                key={selectedChat.id}
                chat={selectedChat}
                messages={messages}
                currentUserId={user!.id}
                onlineUsers={onlineUsers}
                onSendMessage={handleSendMessage}
                onDeleteMessage={handleDeleteMessage}
                socket={socket}
                onOpenGroupInfo={
                  selectedChat.isGroup
                    ? () => setShowGroupInfo(true)
                    : undefined
                }
              />

              {/* Group Info Panel (desktop sidebar) */}
              {showGroupInfo && selectedChat.isGroup && (
                <div className="w-80 border-l border-gray-200 shrink-0 animate-slide-in">
                  <GroupInfoPanel
                    chat={selectedChat}
                    currentUserId={user!.id}
                    allUsers={users}
                    onlineUsers={onlineUsers}
                    onClose={() => setShowGroupInfo(false)}
                    onRenameGroup={handleRenameGroup}
                    onAddMember={handleAddMember}
                    onRemoveMember={handleRemoveMember}
                    onMakeAdmin={handleMakeAdmin}
                    onLeaveGroup={handleLeaveGroup}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center px-6">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-10 h-10 text-blue-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-700">
                  Welcome, {user?.username}!
                </h2>
                <p className="text-gray-500 mt-2">
                  Select a chat or start a new conversation
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Create Group Modal ─────────────────────────────────────────────── */}
      {showCreateGroup && (
        <CreateGroupModal
          users={users}
          currentUserId={user!.id}
          onClose={() => setShowCreateGroup(false)}
          onCreateGroup={handleCreateGroup}
        />
      )}
      {/* ── Confirmation Dialog ────────────────────────────────────────────────── */}
      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      {/* ── Profile Modal ──────────────────────────────────────────────────── */}
      {showProfile && (
        <ProfileModal onClose={() => setShowProfile(false)} />
      )}
    </div>
  );
};
