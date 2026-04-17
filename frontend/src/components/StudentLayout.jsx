import React from 'react';
import Sidebar from './Sidebar';
import { Outlet } from 'react-router-dom';

const StudentLayout = () => {
  return (
    <div className="flex bg-[#f8fafc] text-slate-900 font-sans min-h-screen relative overflow-x-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen relative z-10 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
};

export default StudentLayout;
