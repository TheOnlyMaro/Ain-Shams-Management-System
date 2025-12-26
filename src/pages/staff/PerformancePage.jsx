import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardHeader, CardBody, Button } from '../../components/common';
import { performanceApi } from '../../utils/api';

export const PerformancePage = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const params = {};
      if (user) params.userId = user._id || user.id;
      const res = await performanceApi.listReviews(params);
      if (res.data && res.data.success) setReviews(res.data.data || []);
    } catch (err) {
      console.error('Failed to load performance reviews', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, [user]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Performance Reviews</h1>
          <p className="text-secondary-600">View and manage performance reviews.</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Reviews</h2>
              <Button onClick={fetch} variant="outline" size="sm">Refresh</Button>
            </div>
          </CardHeader>
          <CardBody>
            {loading ? <p>Loading...</p> : (
              <ul className="space-y-4">
                {reviews.length === 0 && <li className="text-secondary-600">No reviews found.</li>}
                {reviews.map(r => (
                  <li key={r.id} className="p-4 border rounded bg-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{r.user_id ? `User ${r.user_id}` : 'Review'}</div>
                        <div className="text-sm text-secondary-600">{String(r.period_start).slice(0,10)} → {String(r.period_end).slice(0,10)}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">Rating: {r.overall_rating ?? '—'}</div>
                        <div className="text-sm text-secondary-600">Status: {r.status}</div>
                      </div>
                    </div>
                    {r.summary && <p className="mt-3 text-sm text-secondary-700">{r.summary}</p>}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
};
