import React, { useEffect, useMemo, useState } from 'react';
import { Download, DollarSign, CalendarDays } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCampus } from '../../context/CampusContext';
import { Card, CardHeader, CardBody, Button, FormSelect } from '../../components/common';
import { formatDate } from '../../utils/dateUtils';

const downloadPayslip = (record) => {
  const content = {
    payslipId: record.id,
    staffId: record.staffId,
    periodStart: record.periodStart,
    periodEnd: record.periodEnd,
    gross: record.gross,
    deductions: record.deductions,
    net: record.net,
    status: record.status,
    paidAt: record.paidAt,
  };

  const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${record.id}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

export const PayrollPage = () => {
  const { user } = useAuth();
  const { seedPayrollForStaffIfNeeded, getPayrollForStaff } = useCampus();

  const staffId = user?._id || user?.id;

  useEffect(() => {
    seedPayrollForStaffIfNeeded(staffId);
  }, [seedPayrollForStaffIfNeeded, staffId]);

  const payroll = useMemo(() => getPayrollForStaff(staffId), [getPayrollForStaff, staffId]);

  const years = useMemo(() => {
    const unique = Array.from(new Set(payroll.map((p) => String(p.periodStart).slice(0, 4))));
    return unique.sort((a, b) => Number(b) - Number(a));
  }, [payroll]);

  const [year, setYear] = useState('all');

  const filtered = useMemo(() => {
    const list = year === 'all' ? payroll : payroll.filter((p) => String(p.periodStart).startsWith(year));
    return [...list].sort((a, b) => new Date(b.periodStart) - new Date(a.periodStart));
  }, [payroll, year]);

  const summary = useMemo(() => {
    const list = year === 'all' ? payroll : payroll.filter((p) => String(p.periodStart).startsWith(year));
    const gross = list.reduce((sum, p) => sum + (Number(p.gross) || 0), 0);
    const deductions = list.reduce((sum, p) => sum + (Number(p.deductions) || 0), 0);
    const net = list.reduce((sum, p) => sum + (Number(p.net) || 0), 0);
    return { gross, deductions, net };
  }, [payroll, year]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-secondary-900">Payroll</h1>
          <p className="text-secondary-600 mt-2">View your payslips and download statements</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-secondary-600 text-sm">Gross</p>
                <p className="text-3xl font-bold text-secondary-800">${summary.gross.toFixed(2)}</p>
              </div>
              <DollarSign className="w-10 h-10 text-primary-200" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-secondary-600 text-sm">Deductions</p>
                <p className="text-3xl font-bold text-secondary-800">${summary.deductions.toFixed(2)}</p>
              </div>
              <DollarSign className="w-10 h-10 text-orange-200" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-secondary-600 text-sm">Net</p>
                <p className="text-3xl font-bold text-secondary-800">${summary.net.toFixed(2)}</p>
              </div>
              <DollarSign className="w-10 h-10 text-green-200" />
            </div>
          </Card>
        </div>

        <Card className="mb-6">
          <CardBody>
            <div className="max-w-[240px]">
              <FormSelect
                label="Year"
                name="year"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                options={[{ label: 'All', value: 'all' }, ...years.map((y) => ({ label: y, value: y }))]}
              />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-bold text-secondary-800">Payslips</h2>
          </CardHeader>
          <CardBody>
            {filtered.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-300">
                      <th className="text-left py-3 px-4 font-semibold text-secondary-700">Period</th>
                      <th className="text-center py-3 px-4 font-semibold text-secondary-700">Gross</th>
                      <th className="text-center py-3 px-4 font-semibold text-secondary-700">Deductions</th>
                      <th className="text-center py-3 px-4 font-semibold text-secondary-700">Net</th>
                      <th className="text-left py-3 px-4 font-semibold text-secondary-700">Paid</th>
                      <th className="text-right py-3 px-4 font-semibold text-secondary-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => (
                      <tr key={p.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                        <td className="py-3 px-4 text-secondary-800">
                          <div className="flex items-center gap-2">
                            <CalendarDays className="w-4 h-4 text-secondary-500" />
                            {String(p.periodStart).slice(0, 10)} → {String(p.periodEnd).slice(0, 10)}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center text-secondary-800 font-medium">${Number(p.gross).toFixed(2)}</td>
                        <td className="py-3 px-4 text-center text-secondary-800 font-medium">${Number(p.deductions).toFixed(2)}</td>
                        <td className="py-3 px-4 text-center text-secondary-800 font-medium">${Number(p.net).toFixed(2)}</td>
                        <td className="py-3 px-4 text-secondary-600">{p.paidAt ? formatDate(p.paidAt) : '—'}</td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2 ml-auto"
                            onClick={() => downloadPayslip(p)}
                          >
                            <Download className="w-4 h-4" />
                            Download
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <DollarSign className="w-16 h-16 text-secondary-300 mx-auto mb-4" />
                <p className="text-secondary-600 text-lg">No payroll records found</p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
};
