import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Eye } from 'lucide-react';
import { useCurriculum } from '../../context/CurriculumContext';
import { Card, CardHeader, CardBody, Button, Modal, FormInput, FormSelect, FormTextarea } from '../../components/common';

export const AdminCoursesPage = () => {
  const { courses, createCourse, updateCourse, deleteCourse } = useCurriculum();
  const [showNewCourseModal, setShowNewCourseModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    instructor: '',
    description: '',
    credits: '3',
    capacity: '30',
    schedule: '',
  });

  const handleResetForm = () => {
    setFormData({
      code: '',
      name: '',
      instructor: '',
      description: '',
      credits: '3',
      capacity: '30',
      schedule: '',
    });
    setEditingCourse(null);
  };

  const handleSaveCourse = (e) => {
    e.preventDefault();
    if (editingCourse) {
      updateCourse(editingCourse.id, {
        ...formData,
        credits: parseInt(formData.credits),
        capacity: parseInt(formData.capacity),
      });
    } else {
      createCourse({
        ...formData,
        credits: parseInt(formData.credits),
        capacity: parseInt(formData.capacity),
      });
    }
    setShowNewCourseModal(false);
    handleResetForm();
  };

  const handleEditCourse = (course) => {
    setFormData({
      code: course.code,
      name: course.name,
      instructor: course.instructor,
      description: course.description,
      credits: course.credits.toString(),
      capacity: course.capacity.toString(),
      schedule: course.schedule,
    });
    setEditingCourse(course);
    setShowNewCourseModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-secondary-900">Course Management</h1>
            <p className="text-secondary-600 mt-2">Create, update, and manage courses</p>
          </div>
          <Button
            variant="primary"
            size="lg"
            onClick={() => {
              handleResetForm();
              setShowNewCourseModal(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Course
          </Button>
        </div>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-bold text-secondary-800">Courses ({courses.length})</h2>
          </CardHeader>
          <CardBody>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-3 px-4 font-semibold text-secondary-700">Code</th>
                    <th className="text-left py-3 px-4 font-semibold text-secondary-700">Course Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-secondary-700">Instructor</th>
                    <th className="text-center py-3 px-4 font-semibold text-secondary-700">Credits</th>
                    <th className="text-center py-3 px-4 font-semibold text-secondary-700">Capacity</th>
                    <th className="text-center py-3 px-4 font-semibold text-secondary-700">Enrolled</th>
                    <th className="text-center py-3 px-4 font-semibold text-secondary-700">Schedule</th>
                    <th className="text-center py-3 px-4 font-semibold text-secondary-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course) => (
                    <tr
                      key={course.id}
                      className="border-b border-gray-200 hover:bg-gray-50 transition"
                    >
                      <td className="py-3 px-4">
                        <span className="font-semibold text-secondary-800">{course.code}</span>
                      </td>
                      <td className="py-3 px-4 text-secondary-800">{course.name}</td>
                      <td className="py-3 px-4 text-secondary-600">{course.instructor}</td>
                      <td className="py-3 px-4 text-center text-secondary-800">{course.credits}</td>
                      <td className="py-3 px-4 text-center text-secondary-800">{course.capacity}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded">
                          {course.enrolled}/{course.capacity}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-secondary-600 text-xs">
                        {course.schedule}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditCourse(course)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => deleteCourse(course.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </div>

      <Modal
        isOpen={showNewCourseModal}
        onClose={() => {
          setShowNewCourseModal(false);
          handleResetForm();
        }}
        title={editingCourse ? 'Edit Course' : 'Create New Course'}
        size="lg"
      >
        <form onSubmit={handleSaveCourse} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Course Code"
              name="code"
              placeholder="e.g., CS101"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              required
            />

            <FormInput
              label="Credits"
              name="credits"
              type="number"
              min="1"
              max="6"
              value={formData.credits}
              onChange={(e) => setFormData({ ...formData, credits: e.target.value })}
              required
            />
          </div>

          <FormInput
            label="Course Name"
            name="name"
            placeholder="Enter course name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <FormInput
            label="Instructor"
            name="instructor"
            placeholder="Enter instructor name"
            value={formData.instructor}
            onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
            required
          />

          <FormInput
            label="Schedule"
            name="schedule"
            placeholder="e.g., MWF 9:00 AM - 10:30 AM"
            value={formData.schedule}
            onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
            required
          />

          <FormInput
            label="Capacity"
            name="capacity"
            type="number"
            min="1"
            value={formData.capacity}
            onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
            required
          />

          <FormTextarea
            label="Description"
            name="description"
            placeholder="Enter course description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            required
          />

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setShowNewCourseModal(false);
                handleResetForm();
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" className="flex-1" type="submit">
              {editingCourse ? 'Update Course' : 'Create Course'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
