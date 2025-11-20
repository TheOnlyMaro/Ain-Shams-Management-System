import React, { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Users, Clock, BookOpen, Download, Trash2, Edit2, Plus } from 'lucide-react';
import { useCurriculum } from '../../context/CurriculumContext';
import { useAuth } from '../../context/AuthContext';
import { Card, CardHeader, CardBody, CardFooter, Button, Modal } from '../../components/common';
import { formatDate, formatTimeAgo } from '../../utils/dateUtils';

export const CourseDetailPage = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const { getCourseById, getMaterialsByCourse, getAssignmentsByCourse } = useCurriculum();
  const [showUploadModal, setShowUploadModal] = useState(false);

  const course = useMemo(() => getCourseById(courseId), [courseId, getCourseById]);
  const materials = useMemo(() => getMaterialsByCourse(courseId), [courseId, getMaterialsByCourse]);
  const assignments = useMemo(
    () => getAssignmentsByCourse(courseId),
    [courseId, getAssignmentsByCourse]
  );

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
                {userRole === 'staff' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowUploadModal(true)}
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
                          <Button variant="outline" size="sm" className="flex items-center gap-1">
                            <Download className="w-4 h-4" />
                            Download
                          </Button>
                          {userRole === 'staff' && (
                            <>
                              <Button variant="outline" size="sm">
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button variant="danger" size="sm">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
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
              <CardHeader>
                <h2 className="text-lg font-bold text-secondary-800">Assignments</h2>
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
                          <Link to={`/assignments/${assignment.id}`}>
                            <Button variant="outline" size="sm">
                              View
                            </Button>
                          </Link>
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

      <Modal isOpen={showUploadModal} onClose={() => setShowUploadModal(false)} title="Upload Material">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">Material Title</label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Enter material title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">File Type</label>
            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option>Select type</option>
              <option value="pdf">PDF</option>
              <option value="video">Video</option>
              <option value="document">Document</option>
              <option value="presentation">Presentation</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">Upload File</label>
            <input
              type="file"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <Button variant="primary" className="w-full">
            Upload Material
          </Button>
        </div>
      </Modal>
    </div>
  );
};
