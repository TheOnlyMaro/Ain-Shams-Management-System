import React, { useMemo, useState } from 'react';
import { Plus, Trash2, FileText, Calendar, BookOpen } from 'lucide-react';
import { useCurriculum } from '../../context/CurriculumContext';
import { Card, CardHeader, CardBody, Button, Modal, FormInput, FormTextarea, FormSelect } from '../../components/common';
import { formatDate, isDatePast } from '../../utils/dateUtils';

export const StaffAssignmentsPage = () => {
  const { courses, assignments, createAssignment, deleteAssignment } = useCurriculum();
  const [showCreate, setShowCreate] = useState(false);
  const [filterCourseId, setFilterCourseId] = useState('all');
  const [form, setForm] = useState({
    courseId: '',
    title: '',
    description: '',
    dueDate: '',
    totalPoints: 100,
  });
  const [error, setError] = useState(null);

  const courseOptions = useMemo(() => {
    const base = [{ label: 'All Courses', value: 'all' }];
    return base.concat(
      courses.map((c) => ({ label: `${c.code || ''} ${c.name || ''}`.trim() || `Course ${c.id}`, value: String(c.id) }))
    );
  }, [courses]);

  const filteredAssignments = useMemo(() => {
    if (!filterCourseId || filterCourseId === 'all') return assignments;
    return assignments.filter((a) => String(a.courseId) === String(filterCourseId));
  }, [assignments, filterCourseId]);

  const handleCreate = (e) => {
    e.preventDefault();
    setError(null);

    if (!form.courseId || !form.title || !form.dueDate) {
      setError('Course, title and due date are required.');
      return;
    }

    createAssignment({
      courseId: form.courseId,
      title: form.title,
      description: form.description,
      dueDate: form.dueDate,
      totalPoints: Number(form.totalPoints || 100),
    });

    setForm({ courseId: '', title: '', description: '', dueDate: '', totalPoints: 100 });
    setShowCreate(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-secondary-900">Assignments (Staff)</h1>
            <p className="text-secondary-600 mt-2">Create and manage assignments for your courses</p>
          </div>
          <Button variant="primary" size="lg" className="flex items-center gap-2" onClick={() => setShowCreate(true)}>
            <Plus className="w-5 h-5" />
            New Assignment
          </Button>
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
                Showing <span className="font-semibold text-secondary-800">{filteredAssignments.length}</span> assignments
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="space-y-4">
          {filteredAssignments.length > 0 ? (
            filteredAssignments.map((a) => {
              const overdue = isDatePast(a.dueDate);
              return (
                <Card key={a.id} className="border-l-4" style={{ borderLeftColor: overdue ? '#ef4444' : '#3b82f6' }}>
                  <div className="flex items-start justify-between p-6 gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-5 h-5 text-primary-600" />
                        <p className="font-semibold text-secondary-800">{a.title}</p>
                        {a.submitted && (
                          <span className="inline-block px-2 py-1 text-xs font-semibold bg-green-100 text-green-700 rounded">
                            Submitted
                          </span>
                        )}
                        {overdue && !a.submitted && (
                          <span className="inline-block px-2 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded">
                            Past due
                          </span>
                        )}
                      </div>
                      <p className="text-secondary-600">{a.description || 'No description'}</p>
                      <div className="flex items-center gap-4 mt-4 text-sm text-secondary-600">
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-4 h-4" />
                          {a.courseName || 'Course'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Due: {formatDate(a.dueDate)}
                        </span>
                        <span className="font-medium">{a.totalPoints} pts</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="danger" size="sm" onClick={() => deleteAssignment(a.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })
          ) : (
            <Card>
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-secondary-300 mx-auto mb-4" />
                <p className="text-secondary-600 text-lg">No assignments yet</p>
                <p className="text-secondary-500">Create one to get started</p>
              </div>
            </Card>
          )}
        </div>

        <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Assignment" size="lg">
          <form onSubmit={handleCreate} className="space-y-4">
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
              placeholder="e.g., Week 3 Homework"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              required
            />

            <FormTextarea
              label="Description"
              name="description"
              rows={4}
              placeholder="Instructions for students"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="Due Date"
                name="dueDate"
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
                required
              />
              <FormInput
                label="Total Points"
                name="totalPoints"
                type="number"
                min={1}
                value={form.totalPoints}
                onChange={(e) => setForm((p) => ({ ...p, totalPoints: e.target.value }))}
              />
            </div>

            <Button variant="primary" className="w-full">
              Create
            </Button>
          </form>
        </Modal>
      </div>
    </div>
  );
};
