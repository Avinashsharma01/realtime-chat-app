// ============================================================================
// GroupInfoPanel Component
// ============================================================================
// A slide-out panel showing group details and management options:
//   - Group name (editable by admin)
//   - Member list with roles
//   - Add member (admin only)
//   - Remove member / promote to admin (admin only)
//   - Leave group
// ============================================================================

import { useState } from 'react';
import type { Chat, User } from '../types';

interface GroupInfoPanelProps {
  chat: Chat;
  currentUserId: string;
  allUsers: User[];
  onlineUsers: string[];
  onClose: () => void;
  onRenameGroup: (chatId: string, name: string) => void;
  onAddMember: (chatId: string, userId: string) => void;
  onRemoveMember: (chatId: string, userId: string) => void;
  onMakeAdmin: (chatId: string, userId: string) => void;
  onLeaveGroup: (chatId: string) => void;
}

export const GroupInfoPanel = ({
  chat,
  currentUserId,
  allUsers,
  onlineUsers,
  onClose,
  onRenameGroup,
  onAddMember,
  onRemoveMember,
  onMakeAdmin,
  onLeaveGroup,
}: GroupInfoPanelProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(chat.name || '');
  const [showAddMember, setShowAddMember] = useState(false);
  const [addSearch, setAddSearch] = useState('');

  // Check if current user is admin
  const currentParticipant = chat.participants.find(
    (p) => p.userId === currentUserId,
  );
  const isAdmin = currentParticipant?.role === 'admin';

  // Members already in the group (Set for O(1) lookup)
  const memberIds = new Set(chat.participants.map((p) => p.userId));

  // Available users to add (not already in the group)
  const addableUsers = allUsers.filter(
    (u) =>
      !memberIds.has(u.id) &&
      u.username.toLowerCase().includes(addSearch.toLowerCase()),
  );

  const handleRename = () => {
    if (newName.trim() && newName.trim() !== chat.name) {
      onRenameGroup(chat.id, newName.trim());
    }
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-end z-50">
      <div className="bg-white w-full max-w-sm h-full flex flex-col shadow-2xl animate-slide-in">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">Group Info</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-100 text-gray-500"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Group Avatar + Name */}
        <div className="p-6 flex flex-col items-center border-b border-gray-100">
          <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 text-2xl font-bold mb-3">
            {(chat.name || 'G')[0].toUpperCase()}
          </div>

          {isEditing ? (
            <div className="flex items-center gap-2 w-full max-w-xs">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              />
              <button
                onClick={handleRename}
                className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setNewName(chat.name || '');
                }}
                className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-800">
                {chat.name || 'Unnamed Group'}
              </h3>
              {isAdmin && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1 rounded hover:bg-gray-100 text-gray-400"
                  title="Rename group"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              )}
            </div>
          )}
          <p className="text-sm text-gray-400 mt-1">
            {chat.participants.length} member{chat.participants.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Add Member Button (admin only) */}
        {isAdmin && (
          <div className="p-3 border-b border-gray-100">
            <button
              onClick={() => setShowAddMember(!showAddMember)}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-green-50 text-green-600 transition-colors"
            >
              <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
                </svg>
              </div>
              <span className="text-sm font-medium">Add Member</span>
            </button>

            {showAddMember && (
              <div className="mt-2">
                <input
                  type="text"
                  value={addSearch}
                  onChange={(e) => setAddSearch(e.target.value)}
                  placeholder="Search users..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                />
                <div className="max-h-40 overflow-y-auto">
                  {addableUsers.length === 0 ? (
                    <p className="text-center text-gray-400 text-xs py-3">No users available</p>
                  ) : (
                    addableUsers.map((u) => (
                      <div
                        key={u.id}
                        onClick={() => {
                          onAddMember(chat.id, u.id);
                          setShowAddMember(false);
                          setAddSearch('');
                        }}
                        className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-gray-50"
                      >
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-semibold">
                          {u.username[0].toUpperCase()}
                        </div>
                        <span className="text-sm text-gray-700">{u.username}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Members List */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-2">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Members
            </h4>
          </div>
          {chat.participants.map((p) => {
            const isOnline = onlineUsers.includes(p.userId);
            const isSelf = p.userId === currentUserId;
            const isParticipantAdmin = p.role === 'admin';

            return (
              <div
                key={p.id}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50"
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                    {p.user.username[0].toUpperCase()}
                  </div>
                  {isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                  )}
                </div>

                {/* Name & Role */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {p.user.username}
                      {isSelf && (
                        <span className="text-gray-400 font-normal"> (You)</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isParticipantAdmin && (
                      <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                        Admin
                      </span>
                    )}
                    <span className={`text-xs ${isOnline ? 'text-green-500' : 'text-gray-400'}`}>
                      {isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>

                {/* Admin actions on other members */}
                {isAdmin && !isSelf && (
                  <div className="flex items-center gap-1">
                    {!isParticipantAdmin && (
                      <button
                        onClick={() => onMakeAdmin(chat.id, p.userId)}
                        className="p-1.5 rounded-md hover:bg-amber-50 text-gray-400 hover:text-amber-600"
                        title="Promote to admin"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => onRemoveMember(chat.id, p.userId)}
                      className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-600"
                      title="Remove from group"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Leave Group */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => onLeaveGroup(chat.id)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Leave Group
          </button>
        </div>
      </div>
    </div>
  );
};
