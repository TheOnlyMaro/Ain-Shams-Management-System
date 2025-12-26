import React, { useMemo, useState } from 'react';
import { GraduationCap, Plus, Award } from 'lucide-react';
import { useCurriculum } from '../../context/CurriculumContext';
import { Card, CardHeader, CardBody, Button, Modal, FormInput, FormSelect, FormTextarea } from '../../components/common';
import { formatDate } from '../../utils/dateUtils';

export const StaffGradesPage = () => {
  const { courses, assignments, grades, addGrade } = useCurriculum();
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    courseId: '',
    assignmentId: '',
    studentId: '',
    studentName: '',
    points: '',
    totalPoints: '',
    feedback: '',
  });

  const courseOptions = useMemo(
    () => courses.map((c) => ({ label: `${c.code || ''} ${c.name || ''}`.trim() || `Course ${c.id}`, value: String(c.id) })),
    [courses]
  );

  const assignmentOptions = useMemo(() => {
    const list = assignments
      .filter((a) => (form.courseId ? String(a.courseId) === String(form.courseId) : true))
      .map((a) => ({ label: `${a.title} (${a.courseName || 'Course'})`, value: String(a.id) }));
    return list;
  }, [assignments, form.courseId]);

  const selectedAssignment = useMemo(
    () => assignments.find((a) => String(a.id) === String(form.assignmentId)) || null,
    [assignments, form.assignmentId]
  );

  const handleSave = async (e) => {
    e.preventDefault();
    setError(null);

    const assignment = selectedAssignment;
    if (!assignment) {
      setError('Please choose an assignment');
      return;
    }

    if (!form.studentId || !form.studentId.trim()) {
      setError('Student ID is required');
      return;
    }

    const points = Number(form.points);
    const total = Number(form.totalPoints || assignment.totalPoints);
    if (!Number.isFinite(points) || !Number.isFinite(total) || total <= 0) {
      setError('Please enter valid points and total points');
      return;
    }

    if (points > total) {
      setError(`Points cannot exceed total points (${total})`);
      return;
    }

    try {
      await addGrade(assignment.id, {
        courseId: assignment.courseId,
        courseName: assignment.courseName,
        assignmentTitle: assignment.title,
        studentId: form.studentId.trim(),
        studentName: form.studentName || null,
        points,
        totalPoints: total,
        feedback: form.feedback,
      });

      setForm({
        courseId: '',
        assignmentId: '',
        studentId: '',
        studentName: '',
        points: '',
        totalPoints: '',
        feedback: '',
      });
      setShowAdd(false);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save grade');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-secondary-900">Grades (Staff)</h1>
            <p className="text-secondary-600 mt-2">Record grades and feedback for assignments</p>
          </div>
          <Button variant="primary" size="lg" className="flex items-center gap-2" onClick={() => setShowAdd(true)}>
            <Plus className="w-5 h-5" />
            Add Grade
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-secondary-600 text-sm">Assignments</p>
                <p className="text-3xl font-bold text-secondary-800">{assignments.length}</p>
              </div>
              <GraduationCap className="w-10 h-10 text-primary-200" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-secondary-600 text-sm">Grades Recorded</p>
                <p className="text-3xl font-bold text-secondary-800">{grades.length}</p>
              </div>
              <Award className="w-10 h-10 text-green-200" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-secondary-600 text-sm">Courses</p>
                <p className="text-3xl font-bold text-secondary-800">{courses.length}</p>
              </div>
              <GraduationCap className="w-10 h-10 text-blue-200" />
            </div>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-bold text-secondary-800">Recent Grades</h2>
          </CardHeader>
          <CardBody>
            {grades.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-300">
                      <th className="text-left py-3 px-4 font-semibold text-secondary-700">Assignment</th>
                      <th className="text-left py-3 px-4 font-semibold text-secondary-700">Student</th>
                      <th className="text-center py-3 px-4 font-semibold text-secondary-700">Score</th>
                      <th className="text-center py-3 px-4 font-semibold text-secondary-700">Grade</th>
                      <th className="text-left py-3 px-4 font-semibold text-secondary-700">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grades.slice(0, 20).map((g) => (
                      <tr key={g.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                        <td className="py-3 px-4 text-secondary-800">{g.assignmentTitle || 'Assignment'}</td>
                        <td className="py-3 px-4 text-secondary-700">{g.studentName || g.studentId || '—'}</td>
                        <td className="py-3 px-4 text-center text-secondary-800 font-medium">
                          {g.points}/{g.totalPoints}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-block px-3 py-1 rounded-full font-bold text-sm bg-gray-100 text-gray-800">
                            {g.letterGrade}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-secondary-600">{formatDate(g.gradedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Award className="w-16 h-16 text-secondary-300 mx-auto mb-4" />
                <p className="text-secondary-600 text-lg">No grades recorded yet</p>
              </div>
            )}
          </CardBody>
        </Card>

        <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Grade" size="lg">
          <form onSubmit={handleSave} className="space-y-4">
            {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">{error}</div>}

            <FormSelect
              label="Course (optional)"
              name="courseId"
              value={form.courseId}
              onChange={(e) => setForm((p) => ({ ...p, courseId: e.target.value, assignmentId: '' }))}
              options={[{ label: 'All Courses', value: '' }, ...courseOptions]}
            />

            <FormSelect
              label="Assignment"
              name="assignmentId"
              value={form.assignmentId}
              onChange={(e) => setForm((p) => ({ ...p, assignmentId: e.target.value }))}
              options={assignmentOptions}
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="Student ID"
                name="studentId"
                placeholder="e.g., 1, 2, 3..."
                value={form.studentId}
                onChange={(e) => setForm((p) => ({ ...p, studentId: e.target.value }))}
                required
              />
              <FormInput
                label="Student Name (optional)"
                name="studentName"
                placeholder="e.g., Alex Johnson"
                value={form.studentName}
                onChange={(e) => setForm((p) => ({ ...p, studentName: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="Points"
                name="points"
                type="number"
                min={0}
                value={form.points}
                onChange={(e) => setForm((p) => ({ ...p, points: e.target.value }))}
                required
              />
              <FormInput
                label="Total Points"
                name="totalPoints"
                type="number"
                min={1}
                value={form.totalPoints}
                onChange={(e) => setForm((p) => ({ ...p, totalPoints: e.target.value }))}
                placeholder={selectedAssignment ? String(selectedAssignment.totalPoints) : '100'}
              />
            </div>

            <FormTextarea
              label="Feedback (optional)"
              name="feedback"
              rows={4}
              value={form.feedback}
              onChange={(e) => setForm((p) => ({ ...p, feedback: e.target.value }))}
            />

            <Button variant="primary" className="w-full">
              Save Grade
            </Button>
          </form>
        </Modal>
      </div>
    </div>
  );
};
