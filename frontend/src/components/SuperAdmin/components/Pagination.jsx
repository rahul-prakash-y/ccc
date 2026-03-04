import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const Pagination = ({ currentPage, totalPages, onPageChange, totalRecords, limit }) => {
    if (totalPages <= 1 && currentPage === 1) return null;

    const startRecord = (currentPage - 1) * limit + 1;
    const endRecord = Math.min(currentPage * limit, totalRecords);

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-1 py-3 border-t border-slate-100 mt-auto">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                Showing <span className="text-slate-900">{startRecord}-{endRecord}</span> of <span className="text-slate-900">{totalRecords}</span> Records
            </div>

            <div className="flex items-center gap-1.5">
                <button
                    onClick={() => onPageChange(1)}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="First Page"
                >
                    <ChevronsLeft size={16} />
                </button>
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Previous Page"
                >
                    <ChevronLeft size={16} />
                </button>

                <div className="flex items-center gap-1 mx-1">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-tighter">Page</span>
                    <span className="flex items-center justify-center min-w-[32px] h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-bold shadow-sm">
                        {currentPage}
                    </span>
                    <span className="text-xs font-black text-slate-400 uppercase tracking-tighter mx-0.5">of</span>
                    <span className="text-xs font-bold text-slate-600">{totalPages}</span>
                </div>

                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Next Page"
                >
                    <ChevronRight size={16} />
                </button>
                <button
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Last Page"
                >
                    <ChevronsRight size={16} />
                </button>
            </div>
        </div>
    );
};

export default Pagination;
