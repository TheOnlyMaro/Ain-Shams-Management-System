import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CalendarDays, MapPin, Share2, Copy, Search } from 'lucide-react';
import { useCampus } from '../../context/CampusContext';
import { Card, CardHeader, CardBody, Button, Modal, FormInput, FormSelect } from '../../components/common';
import { formatDate } from '../../utils/dateUtils';

const useQuery = () => {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
};

export const EventsPage = () => {
  const { events } = useCampus();
  const navigate = useNavigate();
  const query = useQuery();

  const [searchText, setSearchText] = useState('');
  const [category, setCategory] = useState('all');
  const [toast, setToast] = useState(null);

  const selectedEventId = query.get('eventId');
  const selectedEvent = useMemo(
    () => (selectedEventId ? events.find((e) => e.id === selectedEventId) : null),
    [events, selectedEventId]
  );

  const categories = useMemo(() => {
    const unique = Array.from(new Set(events.map((e) => e.category).filter(Boolean)));
    return ['all', ...unique];
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events
      .filter((e) => (!category || category === 'all' ? true : e.category === category))
      .filter((e) => {
        if (!searchText.trim()) return true;
        const s = searchText.trim().toLowerCase();
        return (
          e.title.toLowerCase().includes(s) ||
          (e.description || '').toLowerCase().includes(s) ||
          (e.location || '').toLowerCase().includes(s)
        );
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [events, category, searchText]);

  const buildShareUrl = (eventId) => `${window.location.origin}/events?eventId=${encodeURIComponent(eventId)}`;

  const shareEvent = async (event) => {
    const url = buildShareUrl(event.id);

    try {
      if (navigator.share) {
        await navigator.share({ title: event.title, text: event.description, url });
        setToast('Shared successfully.');
        return;
      }
    } catch {
      // fall through to copy
    }

    try {
      await navigator.clipboard.writeText(url);
      setToast('Link copied to clipboard.');
    } catch {
      setToast('Copy failed. Your browser may block clipboard access.');
    }
  };

  const copyLink = async (event) => {
    const url = buildShareUrl(event.id);
    try {
      await navigator.clipboard.writeText(url);
      setToast('Link copied to clipboard.');
    } catch {
      setToast('Copy failed.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-secondary-900">Events</h1>
          <p className="text-secondary-600 mt-2">Browse campus events and share with others</p>
        </div>

        {toast && (
          <div className="mb-6 p-3 rounded-lg bg-blue-50 text-blue-800 border border-blue-200">
            {toast}
            <button className="ml-2 text-blue-700 underline" onClick={() => setToast(null)}>
              dismiss
            </button>
          </div>
        )}

        <Card className="mb-6">
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <FormInput
                label="Search"
                name="search"
                placeholder="Search events..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
              <FormSelect
                label="Category"
                name="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                options={categories.map((c) => ({ label: c === 'all' ? 'All' : c, value: c }))}
              />
              <div className="text-sm text-secondary-600 flex items-center gap-2">
                <Search className="w-4 h-4" />
                {filteredEvents.length} results
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="space-y-4">
          {filteredEvents.length > 0 ? (
            filteredEvents.map((e) => (
              <Card key={e.id} hoverable>
                <div className="flex items-start justify-between p-6 gap-4">
                  <div className="flex-1">
                    <h2 className="text-lg font-bold text-secondary-800">{e.title}</h2>
                    <p className="text-secondary-600 mt-1">{e.description}</p>

                    <div className="flex items-center gap-4 mt-4 text-sm text-secondary-600 flex-wrap">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-4 h-4" />
                        {formatDate(e.date)} • {e.time}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {e.location}
                      </span>
                      {e.category && (
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 font-semibold">
                          {e.category}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="flex items-center gap-2" onClick={() => copyLink(e)}>
                      <Copy className="w-4 h-4" />
                      Copy
                    </Button>
                    <Button variant="primary" size="sm" className="flex items-center gap-2" onClick={() => shareEvent(e)}>
                      <Share2 className="w-4 h-4" />
                      Share
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/events?eventId=${e.id}`)}>
                      View
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <Card>
              <div className="text-center py-12">
                <CalendarDays className="w-16 h-16 text-secondary-300 mx-auto mb-4" />
                <p className="text-secondary-600 text-lg">No events found</p>
              </div>
            </Card>
          )}
        </div>

        <Modal
          isOpen={!!selectedEvent}
          onClose={() => navigate('/events')}
          title={selectedEvent ? selectedEvent.title : 'Event'}
          size="lg"
        >
          {selectedEvent && (
            <div className="space-y-4">
              <p className="text-secondary-700">{selectedEvent.description}</p>
              <div className="text-sm text-secondary-600 space-y-2">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" />
                  {formatDate(selectedEvent.date)} • {selectedEvent.time}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {selectedEvent.location}
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 flex items-center justify-center gap-2" onClick={() => copyLink(selectedEvent)}>
                  <Copy className="w-4 h-4" />
                  Copy Link
                </Button>
                <Button variant="primary" className="flex-1 flex items-center justify-center gap-2" onClick={() => shareEvent(selectedEvent)}>
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
};
