import React, { useState } from 'react';
import { MessageSquare, Plus, Search, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { ChatData } from '@/types/canvas';

interface ChatSidebarProps {
  chats: ChatData[];
  selectedChatId: string | null;
  isOpen: boolean;
  onToggle: () => void;
  onSelectChat: (chatId: string) => void;
  onNewConversation: () => void;
}

interface ChatHistoryItem {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  messageCount: number;
  model: string;
}

const formatTimestamp = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return new Date(date).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
};

const getChatHistoryFromData = (chat: ChatData): ChatHistoryItem => {
  const lastMessage = chat.messages[chat.messages.length - 1];
  return {
    id: chat.id,
    title: chat.title,
    lastMessage: lastMessage ? lastMessage.content : 'No messages yet',
    timestamp: chat.lastMessageAt || chat.updatedAt,
    messageCount: chat.messages.length,
    model: chat.model
  };
};

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  chats,
  selectedChatId,
  isOpen,
  onToggle,
  onSelectChat,
  onNewConversation
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Convert chats to history items and sort by most recent
  const chatHistory = chats
    .map(getChatHistoryFromData)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Filter chats based on search
  const filteredChats = chatHistory.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group chats by time period
  const groupedChats = {
    today: filteredChats.filter(chat => {
      const diff = Date.now() - new Date(chat.timestamp).getTime();
      return diff < 86400000; // 24 hours
    }),
    thisWeek: filteredChats.filter(chat => {
      const diff = Date.now() - new Date(chat.timestamp).getTime();
      return diff >= 86400000 && diff < 604800000; // 1-7 days
    }),
    older: filteredChats.filter(chat => {
      const diff = Date.now() - new Date(chat.timestamp).getTime();
      return diff >= 604800000; // > 7 days
    })
  };

  return (
    <>
      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full bg-gray-900 shadow-2xl transition-transform duration-300 z-40 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } w-80`}>
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="bg-gray-800 p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-blue-400" />
                <h2 className="text-white text-lg font-semibold">Chat History</h2>
              </div>
              <button
                onClick={onToggle}
                className="p-1 hover:bg-gray-700 rounded transition-colors lg:hidden"
              >
                <ChevronLeft className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            {/* New Conversation Button */}
            <button
              onClick={onNewConversation}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 px-4 flex items-center justify-center gap-2 transition-colors mb-3"
            >
              <Plus className="w-5 h-5" />
              New Conversation
            </button>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full bg-gray-700 text-white rounded-lg pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto p-4">
            {filteredChats.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm">No conversations found</p>
              </div>
            ) : (
              <>
                {/* Today */}
                {groupedChats.today.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-gray-400 text-xs font-semibold uppercase mb-2">Today</h3>
                    <div className="space-y-2">
                      {groupedChats.today.map(chat => (
                        <ChatItem
                          key={chat.id}
                          chat={chat}
                          isSelected={selectedChatId === chat.id}
                          onClick={() => onSelectChat(chat.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* This Week */}
                {groupedChats.thisWeek.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-gray-400 text-xs font-semibold uppercase mb-2">This Week</h3>
                    <div className="space-y-2">
                      {groupedChats.thisWeek.map(chat => (
                        <ChatItem
                          key={chat.id}
                          chat={chat}
                          isSelected={selectedChatId === chat.id}
                          onClick={() => onSelectChat(chat.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Older */}
                {groupedChats.older.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-gray-400 text-xs font-semibold uppercase mb-2">Older</h3>
                    <div className="space-y-2">
                      {groupedChats.older.map(chat => (
                        <ChatItem
                          key={chat.id}
                          chat={chat}
                          isSelected={selectedChatId === chat.id}
                          onClick={() => onSelectChat(chat.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer Stats */}
          <div className="p-4 bg-gray-800 border-t border-gray-700">
            <div className="flex justify-between text-xs text-gray-400">
              <span>{chats.length} conversations</span>
              <span>{chats.reduce((acc, chat) => acc + chat.messages.length, 0)} messages</span>
            </div>
          </div>
        </div>
      </div>

      {/* Toggle Button (when sidebar is closed) */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed left-4 top-4 bg-gray-800 hover:bg-gray-700 p-2 rounded-lg shadow-lg transition-colors z-30"
        >
          <ChevronRight className="w-5 h-5 text-gray-300" />
        </button>
      )}
    </>
  );
};

// Individual Chat Item Component
const ChatItem: React.FC<{
  chat: ChatHistoryItem;
  isSelected: boolean;
  onClick: () => void;
}> = ({ chat, isSelected, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg transition-colors ${
        isSelected 
          ? 'bg-blue-600 bg-opacity-20 border border-blue-500' 
          : 'bg-gray-800 hover:bg-gray-700'
      }`}
    >
      <div className="flex items-start justify-between mb-1">
        <h4 className={`font-medium text-sm line-clamp-1 ${
          isSelected ? 'text-white' : 'text-gray-200'
        }`}>
          {chat.title}
        </h4>
        <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
          {formatTimestamp(chat.timestamp)}
        </span>
      </div>
      <p className={`text-xs line-clamp-2 mb-2 ${
        isSelected ? 'text-gray-300' : 'text-gray-400'
      }`}>
        {chat.lastMessage}
      </p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{chat.model}</span>
          <span className="text-xs text-gray-600">•</span>
          <span className="text-xs text-gray-500">{chat.messageCount} messages</span>
        </div>
        <Clock className="w-3 h-3 text-gray-600" />
      </div>
    </button>
  );
};

export default ChatSidebar;