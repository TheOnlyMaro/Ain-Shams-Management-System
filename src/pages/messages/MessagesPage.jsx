import React, { useState, useMemo } from 'react';
import { MessageSquare, Send, Search, Inbox, Mail, Archive, Star, Clock, User, ArrowLeft } from 'lucide-react';

const MessagesPage = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      thread_id: 1,
      sender_id: 2,
      sender_name: 'Prof. Ahmed Hassan',
      sender_role: 'staff',
      recipient_id: 1,
      recipient_name: 'Student Name',
      subject: 'Question about Assignment 3',
      body: 'I have a question about the requirements for Assignment 3. Could you please clarify the expected format?',
      message_type: 'inquiry',
      priority: 'normal',
      is_read: false,
      is_flagged: false,
      is_archived: false,
      related_course_id: 101,
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      replies: []
    },
    {
      id: 2,
      thread_id: 2,
      sender_id: 3,
      sender_name: 'Dr. Sarah Ahmed',
      sender_role: 'staff',
      recipient_id: 1,
      subject: 'Parent-Teacher Conference',
      body: 'Thank you for scheduling a conference. I wanted to discuss your child\'s recent progress in mathematics.',
      message_type: 'meeting_request',
      priority: 'high',
      is_read: true,
      is_flagged: true,
      is_archived: false,
      related_student_id: 5,
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      replies: [
        {
          id: 3,
          body: 'I\'d be happy to meet. Are you available on Tuesday afternoon?',
          sender_name: 'Parent Name',
          created_at: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString()
        }
      ]
    }
  ]);

  const [selectedMailbox, setSelectedMailbox] = useState('inbox');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCompose, setShowCompose] = useState(false);
  const [replyText, setReplyText] = useState('');

  const userRole = 'student'; // Would come from auth context
  const userId = 1;

  const filteredMessages = useMemo(() => {
    let filtered = messages.filter(msg => {
      if (selectedMailbox === 'inbox') {
        return msg.recipient_id === userId && !msg.is_archived;
      } else if (selectedMailbox === 'sent') {
        return msg.sender_id === userId && !msg.is_archived;
      } else if (selectedMailbox === 'archived') {
        return (msg.sender_id === userId || msg.recipient_id === userId) && msg.is_archived;
      } else if (selectedMailbox === 'flagged') {
        return msg.is_flagged;
      }
      return true;
    });

    if (searchTerm) {
      filtered = filtered.filter(msg =>
        msg.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.body.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.sender_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [messages, selectedMailbox, searchTerm, userId]);

  const unreadCount = useMemo(() => {
    return messages.filter(m => m.recipient_id === userId && !m.is_read && !m.is_archived).length;
  }, [messages, userId]);

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

  const handleSendReply = () => {
    if (!replyText.trim() || !selectedMessage) return;

    const newReply = {
      id: Date.now(),
      body: replyText,
      sender_name: 'Current User',
      created_at: new Date().toISOString()
    };

    setMessages(prev => prev.map(msg => {
      if (msg.id === selectedMessage.id) {
        return {
          ...msg,
          replies: [...(msg.replies || []), newReply]
        };
      }
      return msg;
    }));

    setReplyText('');
  };

  const markAsRead = (messageId) => {
    setMessages(prev => prev.map(msg =>
      msg.id === messageId ? { ...msg, is_read: true } : msg
    ));
  };

  const toggleFlag = (messageId) => {
    setMessages(prev => prev.map(msg =>
      msg.id === messageId ? { ...msg, is_flagged: !msg.is_flagged } : msg
    ));
  };

  const archiveMessage = (messageId) => {
    setMessages(prev => prev.map(msg =>
      msg.id === messageId ? { ...msg, is_archived: true } : msg
    ));
    setSelectedMessage(null);
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
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
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              selectedMailbox === 'inbox' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'
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
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              selectedMailbox === 'sent' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Send className="w-5 h-5" />
            <span className="font-medium">Sent</span>
          </button>

          <button
            onClick={() => setSelectedMailbox('flagged')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              selectedMailbox === 'flagged' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Star className="w-5 h-5" />
            <span className="font-medium">Flagged</span>
          </button>

          <button
            onClick={() => setSelectedMailbox('archived')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              selectedMailbox === 'archived' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'
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
                    if (!message.is_read) markAsRead(message.id);
                  }}
                  className={`p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition ${
                    !message.is_read ? 'bg-blue-50' : ''
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
                          {message.sender_role} • {formatTimeAgo(message.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {message.is_flagged && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
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
                  {message.replies && message.replies.length > 0 && (
                    <p className="text-xs text-blue-600 mt-2">{message.replies.length} replies</p>
                  )}
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
              <div className="flex gap-2">
                <button
                  onClick={() => toggleFlag(selectedMessage.id)}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  <Star className={`w-5 h-5 ${selectedMessage.is_flagged ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'}`} />
                </button>
                <button
                  onClick={() => archiveMessage(selectedMessage.id)}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  <Archive className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedMessage.subject}</h2>
            <div className="flex items-center gap-3">
              <User className="w-10 h-10 p-2 bg-gray-200 rounded-full text-gray-600" />
              <div>
                <p className="font-semibold text-gray-900">{selectedMessage.sender_name}</p>
                <p className="text-sm text-gray-600">
                  {selectedMessage.sender_role} • {new Date(selectedMessage.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-gray-800 whitespace-pre-wrap">{selectedMessage.body}</p>
            </div>

            {selectedMessage.replies && selectedMessage.replies.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Replies ({selectedMessage.replies.length})</h3>
                {selectedMessage.replies.map((reply, index) => (
                  <div key={reply.id || index} className="bg-blue-50 rounded-lg p-4 ml-8">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-6 h-6 p-1 bg-blue-200 rounded-full text-blue-600" />
                      <div>
                        <p className="font-semibold text-gray-900">{reply.sender_name}</p>
                        <p className="text-xs text-gray-600">{new Date(reply.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                    <p className="text-gray-800 whitespace-pre-wrap">{reply.body}</p>
                  </div>
                ))}
              </div>
            )}
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
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">New Message</h2>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
                <input
                  type="text"
                  placeholder="Select recipient..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <input
                  type="text"
                  placeholder="Enter subject..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                <textarea
                  rows={8}
                  placeholder="Type your message..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="direct">Direct Message</option>
                    <option value="inquiry">Inquiry</option>
                    <option value="meeting_request">Meeting Request</option>
                    <option value="feedback">Feedback</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCompose(false)}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Handle send
                    setShowCompose(false);
                  }}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Send Message
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagesPage;