import React, { useEffect, useMemo, useState } from 'react';
import { Users, Link2, BarChart3 } from 'lucide-react';
import { parentApi } from '../../utils/api';
import { Card, CardHeader, CardBody, Button, FormInput } from '../../components/common';

export const ParentProgressPage = () => {
  const [children, setChildren] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [progress, setProgress] = useState([]);

  const [loadingChildren, setLoadingChildren] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [connectForm, setConnectForm] = useState({
    child_name: '',
    child_national_id: '',
    child_id: '',
    child_phone: '',
    parent_national_id: '',
  });

  useEffect(() => {
    fetchChildren();
  }, []);

  useEffect(() => {
    if (selectedStudentId) {
      fetchProgress(selectedStudentId);
    }
  }, [selectedStudentId]);

  const fetchChildren = async () => {
    setError('');
    try {
      setLoadingChildren(true);
      const res = await parentApi.getChildren();
      setChildren(res.data || []);
      if (!selectedStudentId && res.data?.length) {
        setSelectedStudentId(String(res.data[0].id));
      }
    } catch (err) {
      console.error('Error fetching children:', err);
      setError(err.response?.data?.message || 'Failed to load connected children');
    } finally {
      setLoadingChildren(false);
    }
  };

  const fetchProgress = async (studentId) => {
    setError('');
    try {
      setLoadingProgress(true);
      const res = await parentApi.getChildProgress(studentId);
      setProgress(res.data || []);
    } catch (err) {
      console.error('Error fetching progress:', err);
      setError(err.response?.data?.message || 'Failed to load student progress');
    } finally {
      setLoadingProgress(false);
    }
  };

  const groupedProgress = useMemo(() => {
    return (progress || []).reduce((acc, row) => {
      const key = row.course_code || row.course_name || 'Course';
      if (!acc[key]) acc[key] = [];
      acc[key].push(row);
      return acc;
    }, {});
  }, [progress]);

  const handleConnect = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await parentApi.connectChild({
        child_name: connectForm.child_name.trim(),
        child_national_id: connectForm.child_national_id.trim(),
        child_id: connectForm.child_id.trim(),
        child_phone: connectForm.child_phone.trim(),
        parent_national_id: connectForm.parent_national_id.trim(),
      });
      setSuccess('Successfully connected to student.');
      setConnectForm({
        child_name: '',
        child_national_id: '',
        child_id: '',
        child_phone: '',
        parent_national_id: '',
      });
      await fetchChildren();
    } catch (err) {
      console.error('Error connecting student:', err);
      setError(err.response?.data?.message || 'Failed to connect student');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-secondary-900">Parent Progress</h1>
          <p className="text-secondary-600 mt-2">Connect to your child and view academic progress</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">{error}</div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">{success}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-primary-600" />
                <h2 className="text-lg font-bold text-secondary-800">Connect to Student</h2>
              </div>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleConnect} className="space-y-4">
                <FormInput
                  label="Student Name"
                  value={connectForm.child_name}
                  onChange={(e) => setConnectForm((p) => ({ ...p, child_name: e.target.value }))}
                  required
                />
                <FormInput
                  label="Student National ID"
                  value={connectForm.child_national_id}
                  onChange={(e) => setConnectForm((p) => ({ ...p, child_national_id: e.target.value }))}
                  required
                />
                <FormInput
                  label="Student System ID"
                  value={connectForm.child_id}
                  onChange={(e) => setConnectForm((p) => ({ ...p, child_id: e.target.value }))}
                  required
                />
                <FormInput
                  label="Student Phone"
                  value={connectForm.child_phone}
                  onChange={(e) => setConnectForm((p) => ({ ...p, child_phone: e.target.value }))}
                  required
                />
                <FormInput
                  label="Your National ID"
                  value={connectForm.parent_national_id}
                  onChange={(e) => setConnectForm((p) => ({ ...p, parent_national_id: e.target.value }))}
                  required
                />

                <Button type="submit" className="w-full">
                  Connect
                </Button>
              </form>
            </CardBody>
          </Card>

          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary-600" />
                  <h2 className="text-lg font-bold text-secondary-800">Connected Students</h2>
                </div>
              </CardHeader>
              <CardBody>
                {loadingChildren ? (
                  <p className="text-secondary-600">Loading...</p>
                ) : children.length === 0 ? (
                  <p className="text-secondary-600">No connected students yet. Use the form to connect.</p>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                    <select
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      className="w-full sm:max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      {children.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} (ID: {c.id})
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="secondary"
                      onClick={() => selectedStudentId && fetchProgress(selectedStudentId)}
                      disabled={!selectedStudentId}
                    >
                      Refresh
                    </Button>
                  </div>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary-600" />
                  <h2 className="text-lg font-bold text-secondary-800">Progress</h2>
                </div>
              </CardHeader>
              <CardBody>
                {loadingProgress ? (
                  <p className="text-secondary-600">Loading progress...</p>
                ) : !selectedStudentId ? (
                  <p className="text-secondary-600">Select a student to view progress.</p>
                ) : progress.length === 0 ? (
                  <p className="text-secondary-600">No grades found for this student yet.</p>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(groupedProgress).map(([courseKey, rows]) => (
                      <div key={courseKey} className="border rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-4 py-3 border-b">
                          <h3 className="font-semibold text-secondary-800">
                            {rows[0]?.course_name || 'Course'} ({rows[0]?.course_code || courseKey})
                          </h3>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-3 px-4 font-semibold text-secondary-700">Assignment</th>
                                <th className="text-center py-3 px-4 font-semibold text-secondary-700">Score</th>
                                <th className="text-left py-3 px-4 font-semibold text-secondary-700">Feedback</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((r, idx) => (
                                <tr key={`${courseKey}-${idx}`} className="border-b last:border-b-0">
                                  <td className="py-3 px-4 text-secondary-800">{r.assignment_title}</td>
                                  <td className="py-3 px-4 text-center font-medium text-secondary-800">
                                    {r.student_score}/{r.total_points}
                                  </td>
                                  <td className="py-3 px-4 text-secondary-700">{r.feedback || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
