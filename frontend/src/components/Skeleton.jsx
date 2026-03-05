import React from 'react';

export const SkeletonList = ({ count = 5 }) => {
    return (
        <div className="space-y-2 w-full">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl">
                    <div className="flex items-center gap-4 w-2/3">
                        <div className="w-9 h-9 bg-slate-200/80 rounded-lg shrink-0"></div>
                        <div className="space-y-2.5 w-full">
                            <div className="h-4 bg-slate-200/80 rounded-md w-1/3"></div>
                            <div className="h-3 bg-slate-100 rounded-md w-1/4"></div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <div className="w-8 h-8 bg-slate-100 rounded-lg"></div>
                        <div className="w-8 h-8 bg-slate-100 rounded-lg"></div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export const SkeletonGrid = ({ count = 6 }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="animate-pulse px-5 py-6 bg-white border border-slate-200 rounded-2xl flex flex-col gap-5">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-200/80 rounded-xl shrink-0"></div>
                        <div className="space-y-2 w-full">
                            <div className="h-5 bg-slate-200/80 rounded-md w-2/3"></div>
                            <div className="h-3 bg-slate-100 rounded-md w-1/3"></div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="h-3 bg-slate-100 rounded-md w-full"></div>
                        <div className="h-3 bg-slate-100 rounded-md w-5/6"></div>
                    </div>
                    <div className="mt-2 flex gap-2">
                        <div className="h-8 bg-slate-100 rounded-lg w-full"></div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export const SkeletonRow = ({ count = 5 }) => {
    return (
        <div className="w-full border border-slate-200 rounded-xl overflow-hidden bg-white">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-center justify-between p-4 border-b border-slate-100 last:border-b-0">
                    <div className="flex items-center gap-4 w-1/2">
                        <div className="h-4 bg-slate-200/80 rounded w-1/4"></div>
                        <div className="h-3 bg-slate-100 rounded w-1/3"></div>
                    </div>
                    <div className="h-4 bg-slate-200/80 rounded w-16"></div>
                </div>
            ))}
        </div>
    );
}

export const SkeletonCard = () => {
    return (
        <div className="animate-pulse p-6 bg-white border border-slate-200 rounded-2xl flex flex-col gap-4 w-full h-full max-h-[300px]">
            <div className="w-12 h-12 bg-slate-200/80 rounded-xl mb-2"></div>
            <div className="h-6 bg-slate-200/80 rounded-md w-1/2"></div>
            <div className="h-4 bg-slate-100 rounded-md w-3/4"></div>
            <div className="h-4 bg-slate-100 rounded-md w-5/6"></div>
        </div>
    );
};

export const SkeletonCodeArena = () => {
    return (
        <div className="h-screen w-full bg-[#f8fafc] flex flex-col overflow-hidden animate-pulse">
            {/* Header Skeleton */}
            <div className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0">
                <div className="flex gap-4">
                    <div className="w-32 h-6 bg-slate-200 rounded-md"></div>
                    <div className="w-24 h-6 bg-slate-100 rounded-md"></div>
                </div>
                <div className="w-40 h-8 bg-slate-200 rounded-xl"></div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar Skeleton */}
                <div className="w-72 border-r border-slate-200 bg-white flex flex-col shrink-0">
                    <div className="p-4 space-y-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-16 bg-slate-100 rounded-xl border border-slate-200/50"></div>
                        ))}
                    </div>
                </div>

                {/* Main Content Skeleton */}
                <div className="flex-1 flex flex-col min-w-0 bg-white">
                    <div className="p-8 space-y-6">
                        <div className="h-8 bg-slate-200 rounded-md w-1/3"></div>
                        <div className="space-y-3">
                            <div className="h-4 bg-slate-100 rounded-md w-full"></div>
                            <div className="h-4 bg-slate-100 rounded-md w-5/6"></div>
                            <div className="h-4 bg-slate-100 rounded-md w-4/6"></div>
                        </div>
                        <div className="h-64 bg-slate-50 border border-slate-200 rounded-2xl"></div>
                    </div>
                </div>

                {/* Editor Skeleton Area */}
                <div className="w-1/3 border-l border-slate-200 bg-slate-50 flex flex-col">
                    <div className="h-10 border-b border-slate-200 bg-white flex items-center px-4">
                        <div className="w-20 h-4 bg-slate-100 rounded"></div>
                    </div>
                    <div className="flex-1 p-4">
                        <div className="h-full bg-slate-200/50 rounded-xl border border-slate-200"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

