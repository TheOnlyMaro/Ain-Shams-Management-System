import React, { useState, useMemo, useEffect } from 'react';
import { MessageSquare, Send, Search, Inbox, Mail, Archive, Star, Clock, User, ArrowLeft } from 'lucide-react';
import { useAnnouncement } from '../../context/AnnouncementContext';
import { useAuth } from '../../context/AuthContext';
import { formatTimeAgo } from '../../utils/dateUtils';

const MessagesPage = () => {
  const { messages, fetchMessages, sendMessage } = useAnnouncement();
  const { user } = useAuth();
  const [selectedMailbox, setSelectedMailbox] = useState('inbox');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCompose, setShowCompose] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [composeData, setComposeData] = useState({
    recipient_id: '',
    subject: '',
    body: '',
    message_type: 'direct',
    priority: 'normal'
  });

  useEffect(() => {
    fetchMessages(selectedMailbox);
  }, [selectedMailbox, fetchMessages]);

  const filteredMessages = useMemo(() => {
    let filtered = messages || [];
    if (searchTerm) {
      filtered = filtered.filter(msg =>
        (msg.subject?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (msg.body?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (msg.sender_name?.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    return filtered;
  }, [messages, searchTerm]);

  const unreadCount = useMemo(() => {
    return (messages || []).filter(m => m.recipient_id === user?.id && !m.is_read).length;
  }, [messages, user]);

  const getPriorityColor = (priority) => {
    const colors = {
      urgent: 'text-red-600',
      high: 'text-orange-600',
      normal: 'text-gray-600',
      low: 'text-blue-600'
    };
    return colors[priority] || colors.normal;
  };

  const getMessageTypeIcon = (type) => {
    const icons = {
      inquiry: <MessageSquare className="w-4 h-4" />,
      meeting_request: <Clock className="w-4 h-4" />,
      feedback: <Star className="w-4 h-4" />,
      direct: <Mail className="w-4 h-4" />
    };
    return icons[type] || icons.direct;
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedMessage) return;

    try {
      await sendMessage({
        recipient_id: selectedMessage.sender_id,
        subject: `Re: ${selectedMessage.subject}`,
        body: replyText,
        parent_message_id: selectedMessage.id,
        message_type: selectedMessage.message_type,
        priority: selectedMessage.priority
      });
      setReplyText('');
      fetchMessages(selectedMailbox);
    } catch (err) {
      console.error('Failed to send reply:', err);
    }
  };

  const handleComposeSubmit = async (e) => {
    e.preventDefault();
    try {
      await sendMessage({
        ...composeData,
        recipient_id: parseInt(composeData.recipient_id)
      });
      setShowCompose(false);
      setComposeData({
        recipient_id: '',
        subject: '',
        body: '',
        message_type: 'direct',
        priority: 'normal'
      });
      fetchMessages(selectedMailbox);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  return (
    <div className="h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={() => setShowCompose(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            <Send className="w-5 h-5" />
            Compose
          </button>
        </div>

        <nav className="flex-1 p-2">
          <button
            onClick={() => setSelectedMailbox('inbox')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${selectedMailbox === 'inbox' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'
              }`}
          >
            <Inbox className="w-5 h-5" />
            <span className="flex-1 text-left font-medium">Inbox</span>
            {unreadCount > 0 && (
              <span className="px-2 py-1 text-xs font-bold bg-blue-600 text-white rounded-full">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setSelectedMailbox('sent')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${selectedMailbox === 'sent' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'
              }`}
          >
            <Send className="w-5 h-5" />
            <span className="font-medium">Sent</span>
          </button>

          <button
            onClick={() => setSelectedMailbox('archived')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${selectedMailbox === 'archived' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'
              }`}
          >
            <Archive className="w-5 h-5" />
            <span className="font-medium">Archived</span>
          </button>
        </nav>
      </div>

      {/* Message List */}
      {!selectedMessage && (
        <div className="flex-1 flex flex-col bg-white">
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search messages..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <Mail className="w-16 h-16 mb-4 text-gray-300" />
                <p className="text-lg font-medium">No messages</p>
                <p className="text-sm">Your {selectedMailbox} is empty</p>
              </div>
            ) : (
              filteredMessages.map((message) => (
                <div
                  key={message.id}
                  onClick={() => {
                    setSelectedMessage(message);
                  }}
                  className={`p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition ${!message.is_read && message.recipient_id === user?.id ? 'bg-blue-50' : ''
                    }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <User className="w-8 h-8 p-1 bg-gray-200 rounded-full text-gray-600" />
                      <div>
                        <p className={`font-semibold ${!message.is_read ? 'text-gray-900' : 'text-gray-700'}`}>
                          {selectedMailbox === 'sent' ? message.recipient_name : message.sender_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatTimeAgo(message.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getMessageTypeIcon(message.message_type)}
                      <span className={`text-xs font-semibold ${getPriorityColor(message.priority)}`}>
                        {message.priority !== 'normal' && message.priority.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <p className={`text-sm mb-1 ${!message.is_read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                    {message.subject}
                  </p>
                  <p className="text-sm text-gray-600 line-clamp-2">{message.body}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Message Detail */}
      {selectedMessage && (
        <div className="flex-1 flex flex-col bg-white">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setSelectedMessage(null)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </button>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedMessage.subject}</h2>
            <div className="flex items-center gap-3">
              <User className="w-10 h-10 p-2 bg-gray-200 rounded-full text-gray-600" />
              <div>
                <p className="font-semibold text-gray-900">{selectedMessage.sender_name}</p>
                <p className="text-sm text-gray-600">
                  {new Date(selectedMessage.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-gray-800 whitespace-pre-wrap">{selectedMessage.body}</p>
            </div>
          </div>

          <div className="p-4 border-t border-gray-200">
            <div className="flex gap-2">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your reply..."
                rows={3}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <button
                onClick={handleSendReply}
                disabled={!replyText.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <form onSubmit={handleComposeSubmit}>
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900">New Message</h2>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">To (Recipient ID)</label>
                  <input
                    type="number"
                    required
                    value={composeData.recipient_id}
                    onChange={(e) => setComposeData({ ...composeData, recipient_id: e.target.value })}
                    placeholder="Enter user ID..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                  <input
                    type="text"
                    required
                    value={composeData.subject}
                    onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                    placeholder="Enter subject..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                  <textarea
                    rows={8}
                    required
                    value={composeData.body}
                    onChange={(e) => setComposeData({ ...composeData, body: e.target.value })}
                    placeholder="Type your message..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                    <select
                      value={composeData.message_type}
                      onChange={(e) => setComposeData({ ...composeData, message_type: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="direct">Direct Message</option>
                      <option value="inquiry">Inquiry</option>
                      <option value="meeting_request">Meeting Request</option>
                      <option value="feedback">Feedback</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                    <select
                      value={composeData.priority}
                      onChange={(e) => setComposeData({ ...composeData, priority: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCompose(false)}
                    className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Send Message
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagesPage;