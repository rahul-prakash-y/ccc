import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const Pagination = ({ currentPage, totalPages, onPageChange, totalRecords, limit }) => {
    const [pageInput, setPageInput] = useState(currentPage);

    useEffect(() => {
        setPageInput(currentPage);
    }, [currentPage]);

    if (totalPages <= 1 && currentPage === 1) return null;

    const startRecord = (currentPage - 1) * limit + 1;
    const endRecord = (currentPage * limit);


    const handleInputCommit = () => {
        let p = parseInt(pageInput, 10);
        if (isNaN(p) || p < 1) p = 1;
        if (p > totalPages) p = totalPages;
        setPageInput(p);
        if (p !== currentPage) {
            onPageChange(p);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleInputCommit();
        }
    };

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-4 px-1 py-3 border-t border-slate-100 mt-auto">
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
                    <input
                        type="number"
                        min="1"
                        max={totalPages}
                        value={pageInput}
                        onChange={(e) => setPageInput(e.target.value)}
                        onBlur={handleInputCommit}
                        onKeyDown={handleKeyDown}
                        className="w-12 h-8 text-center bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-700 text-sm font-bold shadow-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        title="Enter page number and press Enter"
                    />
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
