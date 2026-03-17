import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, TrendingUp, Users, RefreshCcw, Search, BarChart3, CheckCircle2, FileText, UploadCloud } from 'lucide-react';
import { useAdminStore } from '../../store/adminStore';

const AdminContributionsTab = () => {
  const { contributions: stats, contributionsLoading: isLoading, fetchContributions } = useAdminStore();
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const fetchStats = async (force = false) => {
    if (error) setError(null);
    try {
      await fetchContributions(force);
    } catch (err) {
      setError('An error occurred while fetching data');
      console.error(err);
    }
  };

  useEffect(() => {
    fetchContributions();
  }, [fetchContributions]);

  const filteredStats = stats.filter(s => 
    s.name?.toLowerCase().includes(search.toLowerCase()) || 
    s.studentId?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <PieChart className="text-indigo-600" size={24} />
            Admin Contributions
          </h2>
          <p className="text-sm text-slate-500 mt-1">Overview of question uploads, assignments, and evaluations by admins.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
            />
          </div>
          <button
            onClick={() => fetchStats(true)}
            disabled={isLoading}
            className="p-2 sm:px-4 sm:py-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:text-indigo-600 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCcw size={18} className={isLoading ? "animate-spin" : ""} />
            <span className="hidden sm:inline text-sm font-semibold">Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">&times;</button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <UploadCloud size={24} />
            </div>
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Uploads</p>
                <h3 className="text-2xl font-black text-slate-800">{stats.reduce((acc, curr) => acc + curr.uploadedQuestions, 0)}</h3>
            </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <FileText size={24} />
            </div>
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Assignments</p>
                <h3 className="text-2xl font-black text-slate-800">{stats.reduce((acc, curr) => acc + curr.assignedEvaluations, 0)}</h3>
            </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 size={24} />
            </div>
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Evaluated</p>
                <h3 className="text-2xl font-black text-slate-800">{stats.reduce((acc, curr) => acc + curr.evaluatedQuestions, 0)}</h3>
            </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {isLoading && stats.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400">
            <RefreshCcw className="animate-spin mb-4 text-indigo-500" size={32} />
            <p className="text-sm font-medium">Crunching data...</p>
          </div>
        ) : filteredStats.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
            <Users size={48} className="mb-4 text-slate-300" strokeWidth={1.5} />
            <p className="text-base font-semibold text-slate-600">No admins found</p>
            <p className="text-xs mt-1">Try adjusting your search query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-widest text-slate-500 font-bold">
                  <th className="px-6 py-4 rounded-tl-xl whitespace-nowrap">Admin Details</th>
                  <th className="px-6 py-4 text-center whitespace-nowrap">Questions Uploaded</th>
                  <th className="px-6 py-4 text-center whitespace-nowrap">Assigned for Evaluation</th>
                  <th className="px-6 py-4 text-center rounded-tr-xl whitespace-nowrap">Successfully Evaluated</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filteredStats.map((admin, index) => (
                    <motion.tr
                      key={admin._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-linear-to-tr from-indigo-500 to-violet-500 text-white flex items-center justify-center font-bold shadow-sm shrink-0">
                            {admin.name?.charAt(0)?.toUpperCase() || 'A'}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors whitespace-nowrap">
                              {admin.name}
                              {admin.role === 'SUPER_ADMIN' && (
                                <span className="ml-2 px-1.5 py-0.5 bg-violet-100 text-violet-700 text-[9px] uppercase tracking-wider rounded-md font-black">
                                  Super
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">{admin.studentId || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center justify-center font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">
                          {admin.uploadedQuestions > 0 ? (
                            <span className="text-blue-600">{admin.uploadedQuestions}</span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center justify-center font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">
                          {admin.assignedEvaluations > 0 ? (
                            <span className="text-amber-600">{admin.assignedEvaluations}</span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center">
                          <div className={`px-4 py-1.5 rounded-xl font-bold text-sm border flex items-center gap-2
                            ${admin.evaluatedQuestions > 0 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : 'bg-slate-50 text-slate-400 border-slate-200'}`}
                          >
                            {admin.evaluatedQuestions > 0 && <CheckCircle2 size={16} />}
                            {admin.evaluatedQuestions}
                          </div>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminContributionsTab;
