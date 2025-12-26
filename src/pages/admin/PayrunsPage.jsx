import React, { useEffect, useState } from 'react';
import { Button, Card, CardHeader, CardBody, FormInput } from '../../components/common';
import { payrollApi } from '../../utils/api';

export const PayrunsPage = () => {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await payrollApi.getPayruns();
      if (res.data && res.data.success) setRuns(res.data.data || []);
    } catch (err) {
      console.error('Failed to load payruns', err);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const handleCreate = async () => {
    if (!periodStart || !periodEnd) return;
    setCreating(true);
    try {
      const res = await payrollApi.createPayrun({ periodStart, periodEnd });
      if (res.data && res.data.success) {
        setPeriodStart(''); setPeriodEnd('');
        fetch();
      }
    } catch (err) {
      console.error('Failed to create payrun', err);
    } finally { setCreating(false); }
  };

  const handleFinalize = async (id) => {
    try {
      await payrollApi.finalize(id);
      fetch();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Payroll Runs</h1>
          <p className="text-secondary-600">Create and manage payroll runs.</p>
        </div>

        <Card className="mb-6">
          <CardBody>
            <div className="flex gap-2 items-end">
              <div className="w-48"><FormInput label="Period Start" type="date" value={periodStart} onChange={(e)=>setPeriodStart(e.target.value)} /></div>
              <div className="w-48"><FormInput label="Period End" type="date" value={periodEnd} onChange={(e)=>setPeriodEnd(e.target.value)} /></div>
              <Button onClick={handleCreate} disabled={creating}>Create Payrun</Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Existing Payruns</h2>
          </CardHeader>
          <CardBody>
            {loading ? <p>Loading...</p> : (
              <ul className="space-y-3">
                {runs.length === 0 && <li className="text-secondary-600">No payruns found.</li>}
                {runs.map(r => (
                  <li key={r.id} className="p-3 border rounded bg-white flex justify-between items-center">
                    <div>
                      <div className="font-semibold">{String(r.period_start).slice(0,10)} → {String(r.period_end).slice(0,10)}</div>
                      <div className="text-sm text-secondary-600">Status: {r.status}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={()=>handleFinalize(r.id)}>Finalize</Button>
                    </div>
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
