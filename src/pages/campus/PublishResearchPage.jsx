import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Upload, BookOpen, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useCampus } from '../../context/CampusContext';
import { Card, CardHeader, CardBody, Button, FormInput, FormTextarea } from '../../components/common';

export const PublishResearchPage = () => {
  const navigate = useNavigate();
  const { publishResearch } = useCampus();

  const [form, setForm] = useState({
    title: '',
    abstract: '',
    authors: '',
    keywords: '',
    file: null,
  });

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      await publishResearch({
        title: form.title,
        abstract: form.abstract,
        authors: form.authors
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean),
        keywords: form.keywords
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean),
      });
      setSuccess('Research published successfully.');
      setTimeout(() => navigate('/research'), 800);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to publish');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-secondary-900">Publish Research</h1>
            <p className="text-secondary-600 mt-2">Create a new academic publication</p>
          </div>
          <Link to="/research" className="text-primary-600 hover:text-primary-700 font-medium">
            Back to Research →
          </Link>
        </div>

        {(error || success) && (
          <div
            className={`mb-6 p-3 rounded-lg border ${error ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'
              }`}
          >
            <div className="flex items-center gap-2">
              {error ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
              <span className="font-medium">{error || success}</span>
            </div>
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-bold text-secondary-800">Publication details</h2>
            </div>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-4">
              <FormInput
                label="Title"
                name="title"
                placeholder="Enter the paper title"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                required
              />

              <FormTextarea
                label="Abstract"
                name="abstract"
                rows={6}
                placeholder="Write an abstract..."
                value={form.abstract}
                onChange={(e) => setForm((p) => ({ ...p, abstract: e.target.value }))}
                required
              />

              <FormInput
                label="Authors (comma separated)"
                name="authors"
                placeholder="e.g., Jane Doe, John Smith"
                value={form.authors}
                onChange={(e) => setForm((p) => ({ ...p, authors: e.target.value }))}
              />

              <FormInput
                label="Keywords (comma separated)"
                name="keywords"
                placeholder="e.g., AI, education, systems"
                value={form.keywords}
                onChange={(e) => setForm((p) => ({ ...p, keywords: e.target.value }))}
              />

              <FormInput
                label="Upload PDF (optional)"
                name="file"
                type="file"
                onChange={(e) => setForm((p) => ({ ...p, file: e.target.files?.[0] || null }))}
              />

              <Button variant="primary" className="w-full flex items-center justify-center gap-2">
                <Upload className="w-4 h-4" />
                Publish
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};
