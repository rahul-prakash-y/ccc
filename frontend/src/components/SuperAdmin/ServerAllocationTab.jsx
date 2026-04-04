import React, { useState, useEffect } from 'react';
import { Server, Users, Search, RefreshCcw, LayoutGrid, ServerCrash, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStudentStore } from '../../store/studentStore';
import toast from 'react-hot-toast';

const SERVERS = [
    { id: 'server-1', name: 'Server 1', url: 'https://frontend-frenzy-backend.onrender.com' },
    { id: 'server-2', name: 'Server 2', url: 'https://frontend-frenzy-backend-ajsn.onrender.com' },
    { id: 'server-3', name: 'Server 3', url: 'https://frontend-frenzy-backend-3.onrender.com' },
    { id: 'server-4', name: 'Server 4', url: 'https://frontend-frenzy-backend-8zj1.onrender.com' },
    { id: 'server-5', name: 'Server 5', url: 'https://frontend-frenzy-backend-1-sff6.onrender.com' },
    { id: 'server-6', name: 'Server 6', url: 'https://frontend-frenzy-backend-3ei3.onrender.com' },
    { id: 'server-7', name: 'Server 7', url: 'https://frontend-frenzy-backend-1-8e61.onrender.com' },
    { id: 'server-8', name: 'Server 8', url: 'https://frontend-frenzy-backend-1-7hw2.onrender.com' },
    // Add more servers as needed
];

const ServerAllocationTab = () => {
    const { students, loading, pagination, fetchStudents, allocateServers } = useStudentStore();
    const [search, setSearch] = useState('');
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [selectedServerUrl, setSelectedServerUrl] = useState('');
    const [isAllocating, setIsAllocating] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [limit] = useState(30); // Show 25 per page

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchStudents({ page: currentPage, limit, search }, true);
        }, search ? 500 : 0); // Debounce search
        
        return () => clearTimeout(timer);
    }, [currentPage, limit, search, fetchStudents]);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            setCurrentPage(newPage);
        }
    };

    const toggleStudent = (studentId) => {
        if (selectedStudents.includes(studentId)) {
            setSelectedStudents(selectedStudents.filter(id => id !== studentId));
        } else {
            setSelectedStudents([...selectedStudents, studentId]);
        }
    };

    const toggleAll = () => {
        if (selectedStudents.length === students.length) {
            setSelectedStudents([]);
        } else {
            setSelectedStudents(students.map(s => s.studentId));
        }
    };

    const handleAllocate = async () => {
        if (selectedStudents.length === 0) {
            toast.error("Please select at least one student.");
            return;
        }
        
        setIsAllocating(true);
        // Note: Empty server URL means removing allocation
        const res = await allocateServers(selectedStudents, selectedServerUrl);
        setIsAllocating(false);

        if (res.success) {
            toast.success(`Successfully allocated ${res.count} students to ${selectedServerUrl || 'Default Server'}.`);
            setSelectedStudents([]); // Clear selection on success
        } else {
            toast.error(res.error || "Failed to allocate server.");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-200 pb-4">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                        <Server className="text-indigo-600" size={24} />
                        Server Allocation
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Bulk assign routing servers to 400+ students to manage load.</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => fetchStudents({}, true)}
                        disabled={loading}
                        className="p-2 sm:px-4 sm:py-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2"
                    >
                        <RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
                        <span className="hidden sm:block text-sm font-semibold">Refresh List</span>
                    </button>
                </div>
            </div>

            {/* Allocation Controls Panel */}
            <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 flex flex-col md:flex-row gap-6 items-end">
                <div className="flex-1 w-full space-y-2">
                    <label className="text-sm font-bold text-slate-700 block uppercase tracking-wider">Target Server</label>
                    <select
                        value={selectedServerUrl}
                        onChange={(e) => setSelectedServerUrl(e.target.value)}
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm transition-all"
                    >
                        <option value="">Reset to Default (No Routing)</option>
                        {SERVERS.map(srv => (
                            <option key={srv.id} value={srv.url}>{srv.name} ({srv.url})</option>
                        ))}
                    </select>
                </div>
                
                <div className="flex-1 w-full space-y-2">
                     <label className="text-sm font-bold text-slate-700 block uppercase tracking-wider">Manual Server URL (Optional)</label>
                     <input
                        type="url"
                        placeholder="https://custom.server.com"
                        value={selectedServerUrl}
                        onChange={(e) => setSelectedServerUrl(e.target.value)}
                         className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm transition-all text-sm"
                     />
                </div>

                <div className="w-full md:w-auto">
                    <button
                        onClick={handleAllocate}
                        disabled={isAllocating || selectedStudents.length === 0}
                        className="w-full md:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)] transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                        {isAllocating ? <RefreshCcw className="animate-spin" size={20} /> : <ServerCrash size={20} />}
                        Allocate to {selectedStudents.length} Students
                    </button>
                </div>
            </div>


            {/* Students Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                     <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Find student by ID or name..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                    </div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{selectedStudents.length} Selected</span>
                </div>

                <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-white z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                            <tr className="text-[11px] uppercase tracking-widest text-slate-500 font-bold">
                                <th className="px-6 py-4 w-12 text-center">
                                    <input 
                                        type="checkbox" 
                                        checked={students.length > 0 && selectedStudents.length === students.length}
                                        onChange={toggleAll}
                                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                </th>
                                <th className="px-6 py-4">Student</th>
                                <th className="px-6 py-4">Department</th>
                                <th className="px-6 py-4">Current Allocated Server</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 10 }).map((_, i) => (
                                    <tr key={`skeleton-${i}`} className="animate-pulse border-b border-slate-100 last:border-0">
                                        <td className="px-6 py-4 w-12 text-center">
                                            <div className="w-4 h-4 bg-slate-200 rounded mx-auto"></div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="h-4 bg-slate-200 rounded w-24 mb-2"></div>
                                            <div className="h-3 bg-slate-100 rounded w-16 shadow-sm"></div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="h-6 bg-slate-100 rounded-md w-20"></div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="h-6 bg-slate-100 rounded-lg w-28"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : students.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center text-slate-400">
                                        <Users size={32} className="mx-auto mb-3 text-slate-300" />
                                        <p>No students found matching your search.</p>
                                    </td>
                                </tr>
                            ) : (
                                students.map((student) => (
                                    <tr 
                                        key={student._id} 
                                        onClick={() => toggleStudent(student.studentId)}
                                        className={`border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer ${selectedStudents.includes(student.studentId) ? 'bg-indigo-50/30' : ''}`}
                                    >
                                        <td className="px-6 py-4 text-center">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedStudents.includes(student.studentId)}
                                                onChange={() => {}} // Handled by tr onClick
                                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer pointer-events-none"
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-bold text-slate-800">{student.name}</p>
                                            <p className="text-xs text-slate-400 font-mono">{student.studentId}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-semibold px-2 py-1 bg-slate-100 text-slate-600 rounded-md">
                                                {student.department || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {student.allocatedServer ? (
                                                 <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                                    <LayoutGrid size={12} />
                                                    {student.allocatedServer}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-slate-400 italic">Default</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                        Showing {students.length} of {pagination.totalRecords} Students
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1 || loading}
                            className="p-2 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft size={18} className="text-slate-600" />
                        </button>
                        
                        <div className="flex items-center gap-1">
                            <span className="px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-md shadow-sm">
                                {currentPage}
                            </span>
                            <span className="text-xs text-slate-400 px-1">of</span>
                            <span className="px-3 py-1 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-md">
                                {pagination.totalPages}
                            </span>
                        </div>

                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === pagination.totalPages || loading}
                            className="p-2 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight size={18} className="text-slate-600" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ServerAllocationTab;
