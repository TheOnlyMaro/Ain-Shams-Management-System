import React, { useState, useMemo } from 'react';
import { Bell, Plus, Filter, Trash2, Edit2 } from 'lucide-react';
import { useAnnouncement } from '../../context/AnnouncementContext';
import { useAuth } from '../../context/AuthContext';
import { Card, CardHeader, CardBody, Button, Modal, FormInput, FormTextarea, FormSelect } from '../../components/common';
import { formatTimeAgo } from '../../utils/dateUtils';

export const AnnouncementsPage = () => {
  const { userRole } = useAuth();
  const { announcements, createAnnouncement, deleteAnnouncement, updateAnnouncement } = useAnnouncement();
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [showNewAnnouncement, setShowNewAnnouncement] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'medium',
    tags: '',
  });

  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((ann) => {
      if (selectedPriority === 'all') return true;
      return ann.priority === selectedPriority;
    });
  }, [announcements, selectedPriority]);

  const handleCreateAnnouncement = (e) => {
    e.preventDefault();
    createAnnouncement({
      ...formData,
      author: userRole === 'staff' ? 'Staff Member' : 'Administrator',
      authorRole: userRole,
      tags: formData.tags.split(',').map((tag) => tag.trim()),
    });
    setFormData({ title: '', content: '', priority: 'medium', tags: '' });
    setShowNewAnnouncement(false);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'border-red-300 bg-red-50';
      case 'medium':
        return 'border-yellow-300 bg-yellow-50';
      case 'low':
        return 'border-blue-300 bg-blue-50';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-secondary-900">Announcements</h1>
            <p className="text-secondary-600 mt-2">Stay updated with important university news</p>
          </div>
          {(userRole === 'admin' || userRole === 'staff') && (
            <Button
              variant="primary"
              size="lg"
              onClick={() => setShowNewAnnouncement(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Post Announcement
            </Button>
          )}
        </div>

        <Card className="mb-6">
          <CardBody>
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-5 h-5 text-secondary-600" />
              <span className="font-medium text-secondary-800">Filter by Priority:</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedPriority('all')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  selectedPriority === 'all'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-secondary-800 hover:bg-gray-300'
                }`}
              >
                All ({announcements.length})
              </button>
              <button
                onClick={() => setSelectedPriority('high')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  selectedPriority === 'high'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-secondary-800 hover:bg-gray-300'
                }`}
              >
                High ({announcements.filter((a) => a.priority === 'high').length})
              </button>
              <button
                onClick={() => setSelectedPriority('medium')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  selectedPriority === 'medium'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-secondary-800 hover:bg-gray-300'
                }`}
              >
                Medium ({announcements.filter((a) => a.priority === 'medium').length})
              </button>
              <button
                onClick={() => setSelectedPriority('low')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  selectedPriority === 'low'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-secondary-800 hover:bg-gray-300'
                }`}
              >
                Low ({announcements.filter((a) => a.priority === 'low').length})
              </button>
            </div>
          </CardBody>
        </Card>

        <div className="space-y-4">
          {filteredAnnouncements.length > 0 ? (
            filteredAnnouncements.map((announcement) => (
              <Card key={announcement.id} className={`border-l-4 ${getPriorityColor(announcement.priority)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Bell className="w-5 h-5 text-primary-600" />
                      <h3 className="text-lg font-bold text-secondary-800">{announcement.title}</h3>
                      <span
                        className={`text-xs font-semibold px-3 py-1 rounded-full ${getPriorityBadge(
                          announcement.priority
                        )}`}
                      >
                        {announcement.priority.charAt(0).toUpperCase() + announcement.priority.slice(1)}
                      </span>
                    </div>

                    <p className="text-secondary-700 text-base mb-3">{announcement.content}</p>

                    <div className="flex items-center justify-between text-sm text-secondary-600">
                      <div className="flex items-center gap-4">
                        <span>By {announcement.author}</span>
                        <span>{formatTimeAgo(announcement.createdAt)}</span>
                      </div>
                      {announcement.tags && announcement.tags.length > 0 && (
                        <div className="flex gap-2">
                          {announcement.tags.map((tag) => (
                            <span key={tag} className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {(userRole === 'admin' || userRole === 'staff') && (
                    <div className="ml-4 flex gap-2">
                      <Button variant="outline" size="sm">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => deleteAnnouncement(announcement.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))
          ) : (
            <Card>
              <div className="text-center py-12">
                <Bell className="w-16 h-16 text-secondary-300 mx-auto mb-4" />
                <p className="text-secondary-600 text-lg">No announcements found</p>
                <p className="text-secondary-500">Check back later for updates</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {(userRole === 'admin' || userRole === 'staff') && (
        <Modal
          isOpen={showNewAnnouncement}
          onClose={() => setShowNewAnnouncement(false)}
          title="Post New Announcement"
          size="lg"
        >
          <form onSubmit={handleCreateAnnouncement} className="space-y-4">
            <FormInput
              label="Title"
              name="title"
              placeholder="Enter announcement title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />

            <FormTextarea
              label="Content"
              name="content"
              placeholder="Enter announcement details"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={5}
              required
            />

            <FormSelect
              label="Priority"
              name="priority"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              options={[
                { label: 'High', value: 'high' },
                { label: 'Medium', value: 'medium' },
                { label: 'Low', value: 'low' },
              ]}
            />

            <FormInput
              label="Tags (comma separated)"
              name="tags"
              placeholder="e.g., important, deadline, event"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            />

            <Button variant="primary" className="w-full">
              Post Announcement
            </Button>
          </form>
        </Modal>
      )}
    </div>
  );
};
