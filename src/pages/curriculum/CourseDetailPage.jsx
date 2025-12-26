import React, { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Users, Clock, BookOpen, Download, Trash2, Edit2, Plus } from 'lucide-react';
import { useCurriculum } from '../../context/CurriculumContext';
import { useAuth } from '../../context/AuthContext';
import { Card, CardHeader, CardBody, Button, Modal, PageLoader, FormInput, FormSelect, FormTextarea } from '../../components/common';
import { formatDate, formatTimeAgo } from '../../utils/dateUtils';

const downloadMaterial = async (material) => {
  const url = material?.fileUrl;
  if (!url) return;

  window.open(url, '_blank', 'noopener,noreferrer');
};

export const CourseDetailPage = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const {
    courses,
    getCourseById,
    getMaterialsByCourse,
    getAssignmentsByCourse,
    uploadMaterial,
    deleteMaterial,
    createAssignment,
    deleteAssignment,
  } = useCurriculum();

  const [showMaterialUploadModal, setShowMaterialUploadModal] = useState(false);
  const [showAssignmentCreateModal, setShowAssignmentCreateModal] = useState(false);

  const [materialError, setMaterialError] = useState(null);
  const [assignmentError, setAssignmentError] = useState(null);

  const [materialForm, setMaterialForm] = useState({
    title: '',
    type: 'pdf',
    description: '',
    file: null,
  });

  const [assignmentForm, setAssignmentForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    totalPoints: 100,
  });

  const course = useMemo(() => getCourseById(courseId), [courseId, getCourseById]);
  const materials = useMemo(() => getMaterialsByCourse(courseId), [courseId, getMaterialsByCourse]);
  const assignments = useMemo(() => getAssignmentsByCourse(courseId), [courseId, getAssignmentsByCourse]);

  const canManage = userRole === 'staff' || userRole === 'admin';

  const handleMaterialUpload = async (e) => {
    e.preventDefault();
    setMaterialError(null);

    if (!materialForm.title || materialForm.title.trim() === '') {
      setMaterialError('Title is required.');
      return;
    }

    try {
      const fileSize = materialForm.file ? `${Math.max(1, Math.ceil(materialForm.file.size / 1024))} KB` : '—';
      let fileUrl = null;

      if (materialForm.file) {
        fileUrl = `/uploads/materials/${Date.now()}_${materialForm.file.name}`;
      }

      await uploadMaterial(courseId, {
        title: materialForm.title,
        type: materialForm.type,
        description: materialForm.description,
        fileSize,
        fileName: materialForm.file?.name || null,
        fileUrl: fileUrl,
      });

      setMaterialForm({ title: '', type: 'pdf', description: '', file: null });
      setShowMaterialUploadModal(false);
    } catch (err) {
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        const errorMessages = err.response.data.errors.map((e) => e.msg || e.message).join(', ');
        setMaterialError(errorMessages || 'Validation failed');
      } else {
        setMaterialError(err.response?.data?.message || err.message || 'Failed to upload material');
      }
    }
  };

  const handleAssignmentCreate = async (e) => {
    e.preventDefault();
    setAssignmentError(null);

    if (!assignmentForm.title || !assignmentForm.dueDate) {
      setAssignmentError('Title and due date are required.');
      return;
    }

    try {
      await createAssignment({
        courseId: courseId,
        title: assignmentForm.title,
        description: assignmentForm.description,
        dueDate: assignmentForm.dueDate,
        totalPoints: Number(assignmentForm.totalPoints || 100),
      });

      setAssignmentForm({ title: '', description: '', dueDate: '', totalPoints: 100 });
      setShowAssignmentCreateModal(false);
    } catch (err) {
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        const errorMessages = err.response.data.errors.map((e) => e.msg || e.message).join(', ');
        setAssignmentError(errorMessages || 'Validation failed');
      } else {
        setAssignmentError(err.response?.data?.message || err.message || 'Failed to create assignment');
      }
    }
  };

  const handleDeleteMaterial = async (materialId) => {
    if (window.confirm('Are you sure you want to delete this material?')) {
      try {
        await deleteMaterial(materialId);
      } catch (err) {
        alert(err.response?.data?.message || err.message || 'Failed to delete material');
      }
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    if (window.confirm('Are you sure you want to delete this assignment?')) {
      try {
        await deleteAssignment(assignmentId);
      } catch (err) {
        alert(err.response?.data?.message || err.message || 'Failed to delete assignment');
      }
    }
  };

  if (!course && courses.length === 0) {
    return <PageLoader message="Loading course..." />;
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-secondary-600 text-lg">Course not found</p>
          <Link to="/courses" className="text-primary-600 hover:text-primary-700 mt-4 inline-block">
            Back to Courses
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="inline-block px-3 py-1 text-sm font-semibold bg-primary-100 text-primary-700 rounded">
                  {course.code}
                </span>
              </div>
              <h1 className="text-4xl font-bold text-secondary-900">{course.name}</h1>
              <p className="text-secondary-600 mt-2">{course.description}</p>
            </div>
            {userRole === 'staff' && (
              <div className="flex gap-2">
                <Button variant="outline" size="md" className="flex items-center gap-2">
                  <Edit2 className="w-4 h-4" />
                  Edit
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <Card>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-secondary-600">Enrolled</p>
                  <p className="text-lg font-bold text-secondary-800">
                    {course.enrolled}/{course.capacity}
                  </p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-secondary-600">Credits</p>
                  <p className="text-lg font-bold text-secondary-800">{course.credits}</p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-secondary-600">Schedule</p>
                  <p className="text-sm font-bold text-secondary-800">{course.schedule}</p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-secondary-600">Materials</p>
                  <p className="text-lg font-bold text-secondary-800">{materials.length}</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-secondary-800">Course Materials</h2>
                {canManage && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowMaterialUploadModal(true)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Upload
                  </Button>
                )}
              </CardHeader>
              <CardBody>
                {materials.length > 0 ? (
                  <div className="space-y-3">
                    {materials.map((material) => (
                      <div
                        key={material.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <FileText className="w-5 h-5 text-primary-600" />
                          <div className="flex-1">
                            <p className="font-medium text-secondary-800">{material.title}</p>
                            <p className="text-xs text-secondary-600">
                              {material.type} • {material.fileSize} • {formatTimeAgo(material.uploadedAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1"
                            onClick={() => downloadMaterial(material)}
                          >
                            <Download className="w-4 h-4" />
                            Download
                          </Button>
                          {canManage && (
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDeleteMaterial(material.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-secondary-300 mx-auto mb-2" />
                    <p className="text-secondary-600">No materials uploaded yet</p>
                  </div>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-secondary-800">Assignments</h2>
                {canManage && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowAssignmentCreateModal(true)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Create
                  </Button>
                )}
              </CardHeader>
              <CardBody>
                {assignments.length > 0 ? (
                  <div className="space-y-3">
                    {assignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="p-3 rounded-lg bg-gray-50 border-l-4 border-primary-600"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-secondary-800">{assignment.title}</p>
                            <p className="text-sm text-secondary-600 mt-1">{assignment.description}</p>
                            <p className="text-xs text-orange-600 mt-2">
                              Due: {formatDate(assignment.dueDate)} • {assignment.totalPoints} points
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Link to={`/assignments/${assignment.id}`}>
                              <Button variant="outline" size="sm">
                                View
                              </Button>
                            </Link>
                            {canManage && (
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleDeleteAssignment(assignment.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-secondary-300 mx-auto mb-2" />
                    <p className="text-secondary-600">No assignments yet</p>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <h2 className="text-lg font-bold text-secondary-800">Course Information</h2>
              </CardHeader>
              <CardBody className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-secondary-600 uppercase">Instructor</p>
                  <p className="text-secondary-800 font-medium">{course.instructor}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-secondary-600 uppercase">Schedule</p>
                  <p className="text-secondary-800 font-medium">{course.schedule}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-secondary-600 uppercase">Credits</p>
                  <p className="text-secondary-800 font-medium">{course.credits}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-secondary-600 uppercase">Capacity</p>
                  <p className="text-secondary-800 font-medium">
                    {course.enrolled}/{course.capacity} Students
                  </p>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showMaterialUploadModal}
        onClose={() => {
          setShowMaterialUploadModal(false);
          setMaterialError(null);
        }}
        title="Upload Material"
        size="lg"
      >
        <form onSubmit={handleMaterialUpload} className="space-y-4">
          {materialError && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">{materialError}</div>
          )}

          <FormInput
            label="Material Title"
            name="title"
            placeholder="e.g., Lecture 1 Slides"
            value={materialForm.title}
            onChange={(e) => setMaterialForm((p) => ({ ...p, title: e.target.value }))}
            required
          />

          <FormSelect
            label="Type"
            name="type"
            value={materialForm.type}
            onChange={(e) => setMaterialForm((p) => ({ ...p, type: e.target.value }))}
            options={[
              { label: 'PDF', value: 'pdf' },
              { label: 'Document', value: 'document' },
              { label: 'Presentation', value: 'presentation' },
              { label: 'Video', value: 'video' },
              { label: 'Link', value: 'link' },
            ]}
          />

          <FormTextarea
            label="Description (optional)"
            name="description"
            rows={3}
            placeholder="Short description"
            value={materialForm.description}
            onChange={(e) => setMaterialForm((p) => ({ ...p, description: e.target.value }))}
          />

          <FormInput
            label="File (optional)"
            name="file"
            type="file"
            onChange={(e) => setMaterialForm((p) => ({ ...p, file: e.target.files?.[0] || null }))}
          />

          <Button variant="primary" className="w-full">
            Upload
          </Button>
        </form>
      </Modal>

      <Modal
        isOpen={showAssignmentCreateModal}
        onClose={() => {
          setShowAssignmentCreateModal(false);
          setAssignmentError(null);
        }}
        title="Create Assignment"
        size="lg"
      >
        <form onSubmit={handleAssignmentCreate} className="space-y-4">
          {assignmentError && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">{assignmentError}</div>
          )}

          <FormInput
            label="Title"
            name="title"
            placeholder="e.g., Week 3 Homework"
            value={assignmentForm.title}
            onChange={(e) => setAssignmentForm((p) => ({ ...p, title: e.target.value }))}
            required
          />

          <FormTextarea
            label="Description"
            name="description"
            rows={4}
            placeholder="Instructions for students"
            value={assignmentForm.description}
            onChange={(e) => setAssignmentForm((p) => ({ ...p, description: e.target.value }))}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Due Date"
              name="dueDate"
              type="date"
              value={assignmentForm.dueDate}
              onChange={(e) => setAssignmentForm((p) => ({ ...p, dueDate: e.target.value }))}
              required
            />

            <FormInput
              label="Total Points"
              name="totalPoints"
              type="number"
              min={1}
              value={assignmentForm.totalPoints}
              onChange={(e) => setAssignmentForm((p) => ({ ...p, totalPoints: e.target.value }))}
            />
          </div>

          <Button variant="primary" className="w-full">
            Create
          </Button>
        </form>
      </Modal>
    </div>
  );
};
