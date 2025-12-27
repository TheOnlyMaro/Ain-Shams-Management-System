import React, { useState, useMemo } from 'react';
import { Bell, Plus, Filter, Trash2, Edit2, Calendar, Pin, Eye, MessageSquare, Users } from 'lucide-react';

const EnhancedAnnouncementsPage = () => {
  const [announcements, setAnnouncements] = useState([
    {
      id: 1,
      title: 'Spring Semester Registration Opens',
      content: 'Registration for Spring 2025 semester will begin on January 15th. Please review course offerings and prepare your schedule.',
      priority: 'high',
      category: 'academic',
      target_audience: 'students',
      author_name: 'Academic Office',
      author_role: 'admin',
      is_pinned: true,
      views_count: 156,
      publish_date: new Date().toISOString(),
      tags: ['registration', 'important']
    },
    {
      id: 2,
      title: 'Parent-Teacher Conference Schedule',
      content: 'Individual parent-teacher conferences will be held on February 10-12. Please book your slot through the parent portal.',
      priority: 'medium',
      category: 'parent',
      target_audience: 'parents',
      author_name: 'Student Affairs',
      author_role: 'staff',
      event_date: '2025-02-10',
      event_location: 'Main Building',
      views_count: 89,
      publish_date: new Date().toISOString(),
      tags: ['conference', 'parents']
    },
    {
      id: 3,
      title: 'Career Fair 2025',
      content: 'Join us for the annual career fair featuring 50+ companies. Bring your resume and dress professionally.',
      priority: 'medium',
      category: 'event',
      target_audience: 'students',
      author_name: 'Career Services',
      event_date: '2025-03-15',
      event_location: 'Student Center',
      views_count: 234,
      publish_date: new Date().toISOString(),
      tags: ['career', 'networking']
    }
  ]);

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [selectedAudience, setSelectedAudience] = useState('all');
  const [showNewAnnouncement, setShowNewAnnouncement] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'

  const userRole = 'admin'; // This would come from auth context

  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((ann) => {
      if (selectedCategory !== 'all' && ann.category !== selectedCategory) return false;
      if (selectedPriority !== 'all' && ann.priority !== selectedPriority) return false;
      if (selectedAudience !== 'all' && ann.target_audience !== selectedAudience) return false;
      return true;
    });
  }, [announcements, selectedCategory, selectedPriority, selectedAudience]);

  const getPriorityColor = (priority) => {
    const colors = {
      urgent: 'border-red-500 bg-red-50',
      high: 'border-orange-500 bg-orange-50',
      medium: 'border-yellow-500 bg-yellow-50',
      low: 'border-blue-500 bg-blue-50',
    };
    return colors[priority] || colors.medium;
  };

  const getPriorityBadge = (priority) => {
    const badges = {
      urgent: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-blue-100 text-blue-800',
    };
    return badges[priority] || badges.medium;
  };

  const getCategoryIcon = (category) => {
    const icons = {
      academic: <Bell className="w-5 h-5" />,
      event: <Calendar className="w-5 h-5" />,
      parent: <Users className="w-5 h-5" />,
      student: <MessageSquare className="w-5 h-5" />,
      general: <Bell className="w-5 h-5" />,
    };
    return icons[category] || icons.general;
  };

  const stats = useMemo(() => ({
    total: announcements.length,
    pinned: announcements.filter(a => a.is_pinned).length,
    highPriority: announcements.filter(a => a.priority === 'high' || a.priority === 'urgent').length,
    events: announcements.filter(a => a.event_date).length,
  }), [announcements]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Communication Hub</h1>
            <p className="text-gray-600 mt-2">Announcements, Events, and Messages</p>
          </div>
          {(userRole === 'admin' || userRole === 'staff') && (
            <button
              onClick={() => setShowNewAnnouncement(true)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="w-5 h-5" />
              New Announcement
            </button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Bell className="w-8 h-8 text-blue-200" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Pinned</p>
                <p className="text-3xl font-bold text-purple-600">{stats.pinned}</p>
              </div>
              <Pin className="w-8 h-8 text-purple-200" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">High Priority</p>
                <p className="text-3xl font-bold text-orange-600">{stats.highPriority}</p>
              </div>
              <Bell className="w-8 h-8 text-orange-200" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Events</p>
                <p className="text-3xl font-bold text-green-600">{stats.events}</p>
              </div>
              <Calendar className="w-8 h-8 text-green-200" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <span className="font-semibold text-gray-800">Filters</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                <option value="academic">Academic</option>
                <option value="event">Events</option>
                <option value="parent">Parent</option>
                <option value="student">Student</option>
                <option value="general">General</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Audience</label>
              <select
                value={selectedAudience}
                onChange={(e) => setSelectedAudience(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Audiences</option>
                <option value="students">Students</option>
                <option value="parents">Parents</option>
                <option value="staff">Staff</option>
                <option value="admins">Admins</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">View Mode</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
                    viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  List
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
                    viewMode === 'calendar' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  Calendar
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Announcements List */}
        <div className="space-y-4">
          {filteredAnnouncements.map((announcement) => (
            <div
              key={announcement.id}
              className={`bg-white rounded-lg shadow border-l-4 ${getPriorityColor(announcement.priority)} p-6 hover:shadow-lg transition`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getCategoryIcon(announcement.category)}
                    <h3 className="text-xl font-bold text-gray-900">{announcement.title}</h3>
                    {announcement.is_pinned && (
                      <Pin className="w-5 h-5 text-purple-600" />
                    )}
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${getPriorityBadge(announcement.priority)}`}>
                      {announcement.priority.toUpperCase()}
                    </span>
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-700">
                      {announcement.category}
                    </span>
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-100 text-blue-700">
                      {announcement.target_audience}
                    </span>
                  </div>

                  <p className="text-gray-700 text-base mb-4">{announcement.content}</p>

                  {announcement.event_date && (
                    <div className="flex items-center gap-4 mb-3 p-3 bg-green-50 rounded-lg border border-green-200">
                      <Calendar className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-sm font-semibold text-green-900">
                          {new Date(announcement.event_date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                        {announcement.event_location && (
                          <p className="text-xs text-green-700">{announcement.event_location}</p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-6 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {announcement.views_count} views
                    </span>
                    <span>By {announcement.author_name}</span>
                    <span>
                      {new Date(announcement.publish_date).toLocaleDateString()}
                    </span>
                    {announcement.tags && announcement.tags.length > 0 && (
                      <div className="flex gap-2">
                        {announcement.tags.map((tag) => (
                          <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {(userRole === 'admin' || userRole === 'staff') && (
                  <div className="ml-4 flex gap-2">
                    <button className="p-2 hover:bg-gray-100 rounded transition">
                      <Edit2 className="w-4 h-4 text-gray-600" />
                    </button>
                    <button className="p-2 hover:bg-red-100 rounded transition">
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {filteredAnnouncements.length === 0 && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No announcements found</p>
              <p className="text-gray-500">Try adjusting your filters</p>
            </div>
          )}
        </div>
      </div>

      {/* New Announcement Modal */}
      {showNewAnnouncement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Create Announcement</h2>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter announcement title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
                <textarea
                  rows={5}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter announcement content"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="low">Low</option>
                    <option value="medium" selected>Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="general">General</option>
                    <option value="academic">Academic</option>
                    <option value="event">Event</option>
                    <option value="parent">Parent</option>
                    <option value="student">Student</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Target Audience</label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                  <option value="all">All</option>
                  <option value="students">Students</option>
                  <option value="parents">Parents</option>
                  <option value="staff">Staff</option>
                  <option value="admins">Admins</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="pinned" className="w-4 h-4 text-blue-600" />
                <label htmlFor="pinned" className="text-sm font-medium text-gray-700">Pin this announcement</label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowNewAnnouncement(false)}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Handle submit
                    setShowNewAnnouncement(false);
                  }}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Publish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedAnnouncementsPage;