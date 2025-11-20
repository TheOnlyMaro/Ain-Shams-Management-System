import React, { useMemo } from 'react';
import { BarChart3, TrendingUp, BookOpen, Award } from 'lucide-react';
import { useCurriculum } from '../../context/CurriculumContext';
import { Card, CardHeader, CardBody } from '../../components/common';
import { formatDate } from '../../utils/dateUtils';

export const GradesPage = () => {
  const { grades, courses } = useCurriculum();

  const stats = useMemo(() => {
    if (grades.length === 0) {
      return { average: 0, highest: 0, lowest: 0 };
    }
    const percentages = grades.map((g) => (g.points / g.totalPoints) * 100);
    return {
      average: (percentages.reduce((a, b) => a + b, 0) / percentages.length).toFixed(1),
      highest: Math.max(...percentages).toFixed(1),
      lowest: Math.min(...percentages).toFixed(1),
    };
  }, [grades]);

  const gradesByColor = (letterGrade) => {
    switch (letterGrade) {
      case 'A':
      case 'A+':
        return 'bg-green-100 text-green-800';
      case 'B':
      case 'B+':
        return 'bg-blue-100 text-blue-800';
      case 'C':
      case 'C+':
        return 'bg-yellow-100 text-yellow-800';
      case 'D':
        return 'bg-orange-100 text-orange-800';
      case 'F':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const groupedGrades = useMemo(() => {
    return grades.reduce((acc, grade) => {
      const courseId = grade.courseId;
      if (!acc[courseId]) {
        acc[courseId] = [];
      }
      acc[courseId].push(grade);
      return acc;
    }, {});
  }, [grades]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-secondary-900">Your Grades</h1>
          <p className="text-secondary-600 mt-2">View your academic performance</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-secondary-600 text-sm">Current Average</p>
                <p className="text-3xl font-bold text-secondary-800">{stats.average}%</p>
              </div>
              <BarChart3 className="w-8 h-8 text-primary-200" />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-secondary-600 text-sm">Highest Score</p>
                <p className="text-3xl font-bold text-green-600">{stats.highest}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-200" />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-secondary-600 text-sm">Lowest Score</p>
                <p className="text-3xl font-bold text-orange-600">{stats.lowest}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-200 transform rotate-180" />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-secondary-600 text-sm">Graded Assignments</p>
                <p className="text-3xl font-bold text-secondary-800">{grades.length}</p>
              </div>
              <Award className="w-8 h-8 text-purple-200" />
            </div>
          </Card>
        </div>

        {grades.length > 0 ? (
          <div className="space-y-6">
            {Object.entries(groupedGrades).map(([courseId, courseGrades]) => {
              const course = courses.find((c) => c.id === courseId);
              return (
                <Card key={courseId}>
                  <CardHeader>
                    <h2 className="text-lg font-bold text-secondary-800">
                      {course?.name || 'Course'} ({course?.code || 'N/A'})
                    </h2>
                  </CardHeader>
                  <CardBody>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b-2 border-gray-300">
                            <th className="text-left py-3 px-4 font-semibold text-secondary-700">
                              Assignment
                            </th>
                            <th className="text-center py-3 px-4 font-semibold text-secondary-700">
                              Score
                            </th>
                            <th className="text-center py-3 px-4 font-semibold text-secondary-700">
                              Percentage
                            </th>
                            <th className="text-center py-3 px-4 font-semibold text-secondary-700">
                              Grade
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-secondary-700">
                              Graded Date
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {courseGrades.map((grade) => {
                            const percentage = ((grade.points / grade.totalPoints) * 100).toFixed(1);
                            return (
                              <tr
                                key={grade.id}
                                className="border-b border-gray-200 hover:bg-gray-50 transition"
                              >
                                <td className="py-3 px-4 text-secondary-800">
                                  {grade.assignmentTitle}
                                </td>
                                <td className="py-3 px-4 text-center font-medium text-secondary-800">
                                  {grade.points}/{grade.totalPoints}
                                </td>
                                <td className="py-3 px-4 text-center font-medium text-secondary-800">
                                  {percentage}%
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span
                                    className={`inline-block px-3 py-1 rounded-full font-bold text-sm ${gradesByColor(
                                      grade.letterGrade
                                    )}`}
                                  >
                                    {grade.letterGrade}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-secondary-600">
                                  {formatDate(grade.gradedAt)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      {courseGrades[0]?.feedback && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-sm font-semibold text-blue-900 mb-1">Feedback:</p>
                          <p className="text-sm text-blue-800">{courseGrades[0].feedback}</p>
                        </div>
                      )}
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <div className="text-center py-12">
              <Award className="w-16 h-16 text-secondary-300 mx-auto mb-4" />
              <p className="text-secondary-600 text-lg">No grades available yet</p>
              <p className="text-secondary-500">Your grades will appear here as assignments are graded</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
