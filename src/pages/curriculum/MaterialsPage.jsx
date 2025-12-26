import React, { useMemo, useState } from 'react';
import { Download, FileText, Plus, Trash2, BookOpen } from 'lucide-react';
import { useCurriculum } from '../../context/CurriculumContext';
import { useAuth } from '../../context/AuthContext';
import { Card, CardHeader, CardBody, Button, Modal, FormInput, FormSelect } from '../../components/common';
import { formatTimeAgo } from '../../utils/dateUtils';

const downloadPlaceholder = (material) => {
  const content = `Material: ${material.title}\nType: ${material.type || 'N/A'}\nCourse: ${material.courseName || material.courseId || 'N/A'}\nUploaded: ${material.uploadedAt}`;
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(material.title || 'material').replace(/\s+/g, '_')}.txt`;
  a.click();
  URL.revokeObjectURL(url);
};

export const MaterialsPage = () => {
  const { userRole } = useAuth();
  const { courses, materials, uploadMaterial, deleteMaterial } = useCurriculum();

  const [filterCourseId, setFilterCourseId] = useState('all');
  const [showUpload, setShowUpload] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    courseId: '',
    title: '',
    type: 'pdf',
    file: null,
  });

  const courseOptions = useMemo(() => {
    const base = [{ label: 'All Courses', value: 'all' }];
    return base.concat(
      courses.map((c) => ({ label: `${c.code || ''} ${c.name || ''}`.trim() || `Course ${c.id}`, value: String(c.id) }))
    );
  }, [courses]);

  const visibleMaterials = useMemo(() => {
    if (!filterCourseId || filterCourseId === 'all') return materials;
    return materials.filter((m) => String(m.courseId) === String(filterCourseId));
  }, [materials, filterCourseId]);

  const canManage = userRole === 'staff' || userRole === 'admin';

  const handleUpload = async (e) => {
    e.preventDefault();
    setError(null);

    if (!form.courseId || form.courseId === '' || form.courseId === 'all') {
      setError('Please select a course.');
      return;
    }

    if (!form.title || form.title.trim() === '') {
      setError('Title is required.');
      return;
    }
    
    // Ensure courseId is a valid number
    const courseIdNum = parseInt(form.courseId, 10);
    if (isNaN(courseIdNum) || courseIdNum <= 0) {
      setError(`Invalid course ID: ${form.courseId}`);
      return;
    }

    const fileSize = form.file ? `${Math.max(1, Math.ceil(form.file.size / 1024))} KB` : '—';

    try {
      // Generate fileUrl - if file is provided, use blob URL temporarily
      // In production, upload file to storage first and get the actual URL
      let fileUrl = null;
      if (form.file) {
        // For now, use a placeholder path. In production, upload file first
        fileUrl = `/uploads/materials/${Date.now()}_${form.file.name}`;
      }
      
      await uploadMaterial(courseIdNum, {
        title: form.title,
        type: form.type,
        fileSize,
        fileName: form.file?.name || null,
        fileUrl: fileUrl,
      });

      setForm({ courseId: '', title: '', type: 'pdf', file: null });
      setShowUpload(false);
    } catch (err) {
      // Show validation errors if available
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        const errorMessages = err.response.data.errors.map((e) => e.msg || e.message).join(', ');
        setError(errorMessages || 'Validation failed');
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to upload material');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-secondary-900">Materials</h1>
            <p className="text-secondary-600 mt-2">Browse and download course materials</p>
          </div>

          {canManage && (
            <Button variant="primary" size="lg" className="flex items-center gap-2" onClick={() => setShowUpload(true)}>
              <Plus className="w-5 h-5" />
              Upload
            </Button>
          )}
        </div>

        <Card className="mb-6">
          <CardBody>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="min-w-[260px]">
                <FormSelect
                  label="Filter by course"
                  name="courseFilter"
                  value={filterCourseId}
                  onChange={(e) => setFilterCourseId(e.target.value || 'all')}
                  options={courseOptions}
                />
              </div>
              <div className="text-sm text-secondary-600">
                Showing <span className="font-semibold text-secondary-800">{visibleMaterials.length}</span> materials
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-bold text-secondary-800">All Materials</h2>
          </CardHeader>
          <CardBody>
            {visibleMaterials.length > 0 ? (
              <div className="space-y-3">
                {visibleMaterials.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <FileText className="w-5 h-5 text-primary-600" />
                      <div className="flex-1">
                        <p className="font-medium text-secondary-800">{m.title}</p>
                        <p className="text-xs text-secondary-600">
                          {m.type || 'file'} • {m.fileSize || '—'} • {m.courseName || m.courseId || 'Course'} •{' '}
                          {m.uploadedAt ? formatTimeAgo(m.uploadedAt) : '—'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="flex items-center gap-1" onClick={() => downloadPlaceholder(m)}>
                        <Download className="w-4 h-4" />
                        Download
                      </Button>
                      {canManage && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={async () => {
                            if (window.confirm('Are you sure you want to delete this material?')) {
                              try {
                                await deleteMaterial(m.id);
                              } catch (err) {
                                alert(err.response?.data?.message || err.message || 'Failed to delete material');
                              }
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 text-secondary-300 mx-auto mb-4" />
                <p className="text-secondary-600 text-lg">No materials found</p>
                <p className="text-secondary-500">Upload materials to make them available here</p>
              </div>
            )}
          </CardBody>
        </Card>

        <Modal isOpen={showUpload} onClose={() => setShowUpload(false)} title="Upload Material" size="lg">
          <form onSubmit={handleUpload} className="space-y-4">
            {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">{error}</div>}

            <FormSelect
              label="Course"
              name="courseId"
              value={form.courseId}
              onChange={(e) => setForm((p) => ({ ...p, courseId: e.target.value }))}
              options={courses.map((c) => ({
                label: `${c.code || ''} ${c.name || ''}`.trim() || `Course ${c.id}`,
                value: String(c.id),
              }))}
              required
            />

            <FormInput
              label="Title"
              name="title"
              placeholder="e.g., Lecture 1 Slides"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              required
            />

            <FormSelect
              label="Type"
              name="type"
              value={form.type}
              onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
              options={[
                { label: 'PDF', value: 'pdf' },
                { label: 'Document', value: 'document' },
                { label: 'Presentation', value: 'presentation' },
                { label: 'Video', value: 'video' },
              ]}
            />

            <FormInput
              label="File (optional)"
              name="file"
              type="file"
              onChange={(e) => setForm((p) => ({ ...p, file: e.target.files?.[0] || null }))}
            />

            <Button variant="primary" className="w-full">
              Upload
            </Button>
          </form>
        </Modal>
      </div>
    </div>
  );
};
