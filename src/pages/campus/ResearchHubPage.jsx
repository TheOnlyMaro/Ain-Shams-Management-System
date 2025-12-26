import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, Share2, Copy, Search, Tag } from 'lucide-react';
import { useCampus } from '../../context/CampusContext';
import { Card, CardHeader, CardBody, Button, Modal, FormInput } from '../../components/common';
import { formatDate } from '../../utils/dateUtils';

const useQuery = () => {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
};

export const ResearchHubPage = () => {
  const { researchPublications } = useCampus();
  const navigate = useNavigate();
  const query = useQuery();

  const [searchText, setSearchText] = useState('');
  const [toast, setToast] = useState(null);

  const selectedId = query.get('paper');
  const selected = useMemo(
    () => (selectedId ? researchPublications.find((p) => p.id === selectedId) : null),
    [researchPublications, selectedId]
  );

  const filtered = useMemo(() => {
    if (!searchText.trim()) return researchPublications;
    const s = searchText.trim().toLowerCase();
    return researchPublications.filter((p) => {
      const blob = `${p.title} ${p.abstract} ${(p.authors || []).join(' ')} ${(p.keywords || []).join(' ')}`.toLowerCase();
      return blob.includes(s);
    });
  }, [researchPublications, searchText]);

  const buildUrl = (id) => `${window.location.origin}/research?paper=${encodeURIComponent(id)}`;

  const copyLink = async (paper) => {
    try {
      await navigator.clipboard.writeText(buildUrl(paper.id));
      setToast('Link copied to clipboard.');
    } catch {
      setToast('Copy failed.');
    }
  };

  const share = async (paper) => {
    const url = buildUrl(paper.id);
    try {
      if (navigator.share) {
        await navigator.share({ title: paper.title, text: paper.abstract, url });
        setToast('Shared successfully.');
        return;
      }
    } catch {
      // ignore
    }

    await copyLink(paper);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-secondary-900">Research</h1>
            <p className="text-secondary-600 mt-2">Browse publications and share research links</p>
          </div>
          <Link to="/research/publish" className="text-primary-600 hover:text-primary-700 font-medium">
            Publish Research →
          </Link>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <FormInput
                label="Search"
                name="search"
                placeholder="Title, author, keyword..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
              <div className="text-sm text-secondary-600 flex items-center gap-2">
                <Search className="w-4 h-4" />
                {filtered.length} results
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="space-y-4">
          {filtered.length > 0 ? (
            filtered.map((p) => (
              <Card key={p.id} hoverable>
                <div className="flex items-start justify-between p-6 gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen className="w-5 h-5 text-primary-600" />
                      <h2 className="text-lg font-bold text-secondary-800">{p.title}</h2>
                    </div>
                    <p className="text-secondary-600">{p.abstract}</p>

                    <div className="mt-3 text-sm text-secondary-600">
                      <span className="font-medium">Authors:</span> {(p.authors || []).join(', ') || '—'}
                    </div>

                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      {(p.keywords || []).slice(0, 8).map((k) => (
                        <span key={k} className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 font-semibold flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {k}
                        </span>
                      ))}
                    </div>

                    <p className="text-xs text-secondary-500 mt-3">
                      Published: {p.publishedAt ? formatDate(p.publishedAt) : '—'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="flex items-center gap-2" onClick={() => copyLink(p)}>
                      <Copy className="w-4 h-4" />
                      Copy
                    </Button>
                    <Button variant="primary" size="sm" className="flex items-center gap-2" onClick={() => share(p)}>
                      <Share2 className="w-4 h-4" />
                      Share
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/research?paper=${p.id}`)}>
                      View
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <Card>
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 text-secondary-300 mx-auto mb-4" />
                <p className="text-secondary-600 text-lg">No publications found</p>
              </div>
            </Card>
          )}
        </div>

        <Modal isOpen={!!selected} onClose={() => navigate('/research')} title={selected?.title || 'Publication'} size="lg">
          {selected && (
            <div className="space-y-4">
              <p className="text-secondary-700 whitespace-pre-wrap">{selected.abstract}</p>
              <p className="text-sm text-secondary-600">
                <span className="font-medium">Authors:</span> {(selected.authors || []).join(', ') || '—'}
              </p>
              <p className="text-sm text-secondary-600">
                <span className="font-medium">Published:</span> {selected.publishedAt ? formatDate(selected.publishedAt) : '—'}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 flex items-center justify-center gap-2" onClick={() => copyLink(selected)}>
                  <Copy className="w-4 h-4" />
                  Copy Link
                </Button>
                <Button variant="primary" className="flex-1 flex items-center justify-center gap-2" onClick={() => share(selected)}>
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
