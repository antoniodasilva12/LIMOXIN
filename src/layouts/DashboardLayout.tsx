import React from 'react';
import Sidebar from '../components/layout/Sidebar';
import ChatBot from '../components/ChatBot';

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: 'admin' | 'student';
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, role }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar role={role} />
      <div className="ml-64 p-8">
        {children}
      </div>
      {role === 'student' && <ChatBot />}
    </div>
  );
};

export default DashboardLayout;