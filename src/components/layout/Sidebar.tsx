import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { FiHome, FiLogOut, FiTool } from 'react-icons/fi';
import { GiWashingMachine } from 'react-icons/gi';
import { IoBedOutline } from 'react-icons/io5';
import { BsCalendarCheck, BsPersonCircle } from 'react-icons/bs';
import { MdOutlineBedroomParent } from 'react-icons/md';
import { RiLeafLine } from 'react-icons/ri';

interface SidebarProps {
  role: 'admin' | 'student';
}

const Sidebar: React.FC<SidebarProps> = ({ role }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <div className="fixed left-0 top-0 h-screen w-64 bg-gray-800 shadow-lg flex flex-col">
      <div className="p-4">
        <h2 className="text-xl font-bold text-white">
          {role === 'admin' ? 'Admin Panel' : 'Student Portal'}
        </h2>
      </div>

      <nav className="flex-1 overflow-y-auto">
        <div className="h-full">
          {role === 'admin' ? (
            <ul className="space-y-1 px-2">
            <li>
              <Link to="/admin" className="flex items-center px-6 py-3 text-white hover:bg-gray-700">
                <FiHome className="w-5 h-5 mr-3" />
                Dashboard
              </Link>
            </li>
            <li>
              <Link to="/admin/students" className="flex items-center px-6 py-3 text-white hover:bg-gray-700">
                <BsPersonCircle className="w-5 h-5 mr-3" />
                Students
              </Link>
            </li>
            <li>
              <Link to="/admin/rooms" className="flex items-center px-6 py-3 text-white hover:bg-gray-700">
                <IoBedOutline className="w-5 h-5 mr-3" />
                Rooms
              </Link>
            </li>
            <li>
              <Link to="/admin/allocations" className="flex items-center px-6 py-3 text-white hover:bg-gray-700">
                <MdOutlineBedroomParent className="w-5 h-5 mr-3" />
                Room Allocation
              </Link>
            </li>
            <li>
              <Link to="/admin/maintenance" className="flex items-center px-6 py-3 text-white hover:bg-gray-700">
                <FiTool className="w-5 h-5 mr-3" />
                Maintenance
              </Link>
            </li>
          </ul>
        ) : (
          <ul className="space-y-2">
            <li>
              <Link to="/student" className="flex items-center px-6 py-3 text-white hover:bg-gray-700">
                <FiHome className="w-5 h-5 mr-3" />
                Dashboard
              </Link>
            </li>
            <li>
              <Link to="/student/profile" className="flex items-center px-6 py-3 text-white hover:bg-gray-700">
                <BsPersonCircle className="w-5 h-5 mr-3" />
                My Profile
              </Link>
            </li>
            <li>
              <Link to="/student/room" className="flex items-center px-6 py-3 text-white hover:bg-gray-700">
                <IoBedOutline className="w-5 h-5 mr-3" />
                My Room
              </Link>
            </li>
            <li>
              <Link to="/student/book" className="flex items-center px-6 py-3 text-white hover:bg-gray-700">
                <BsCalendarCheck className="w-5 h-5 mr-3" />
                Book Room
              </Link>
            </li>
            <li>
              <Link to="/student/maintenance" className="flex items-center px-6 py-3 text-white hover:bg-gray-700">
                <FiTool className="w-5 h-5 mr-3" />
                Maintenance
              </Link>
            </li>
            <li>
              <Link to="/student/laundry" className="flex items-center px-6 py-3 text-white hover:bg-gray-700">
                <GiWashingMachine className="w-5 h-5 mr-3" />
                Laundry Request
              </Link>
            </li>
            <li>
              <Link to="/student/meal" className="flex items-center px-6 py-3 text-white hover:bg-gray-700">
                <RiLeafLine className="w-5 h-5 mr-3" />
                Meal Plan
              </Link>
            </li>
            <li>
              <Link to="/student/resources" className="flex items-center px-6 py-3 text-white hover:bg-gray-700">
                <RiLeafLine className="w-5 h-5 mr-3" />
                Resources
              </Link>
            </li>
          </ul>
        )}
        </div>
      </nav>

      <div className="border-t border-gray-700 bg-gray-800 p-2">
        <button
          onClick={handleLogout}
          className="flex items-center w-full px-3 py-1.5 text-white hover:bg-gray-700 text-sm"
        >
          <FiLogOut className="w-4 h-4 mr-2" />
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;