import { useEffect, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { supabase } from '../../services/supabase';
import { default as StudentRoom } from '../student/Room';
import BookRoom from '../student/BookRoom';
import Profile from '../student/Profile';
import MaintenanceRequest from '../student/MaintenanceRequest';
import ResourceManagement from '../student/ResourceManagement';
import LaundryRequest from '../student/LaundryRequest';
import MealPlan from '../../components/student/MealPlan';

type Room = {
  room_number: string;
  type: string;
  floor: number;
}

interface StudentBooking {
  id: string;
  check_in_date: string;
  check_out_date: string;
  status: string;
  payment_status: string;
}

const StudentDashboard = () => {
  // Removed unused room state since it's not being read anywhere in the component
  const [booking, setBooking] = useState<StudentBooking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // Get student's room
          const { data: roomData } = await supabase
            .from('profiles')
            .select('room_id')
            .eq('id', user.id)
            .single();

          if (roomData?.room_id) {
            const { data: room } = await supabase
              .from('rooms')
              .select('room_number, type, floor')
              .eq('id', roomData.room_id)
              .single();
            
// Removed setRoom since room state is not defined
          }

          // Get student's latest booking
          const { data: bookingData } = await supabase
            .from('bookings')
            .select('*')
            .eq('student_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          setBooking(bookingData);
        }
      } catch (error) {
        console.error('Error fetching student data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, []);

  if (loading) {
    return (
      <DashboardLayout role="student">
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-600">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="student">
      <Routes>
        <Route index element={<StudentHome />} />
        <Route path="room" element={<StudentRoom />} />
        <Route path="book" element={<BookRoom />} />
        <Route path="profile" element={<Profile />} />
        <Route path="maintenance" element={<MaintenanceRequest />} />
        <Route path="resources" element={<ResourceManagement />} />
        <Route path="laundry" element={<LaundryRequest />} />
        <Route path="meal-plan" element={<MealPlan />} />
      </Routes>
    </DashboardLayout>
  );
};

const StudentHome = () => {
  const navigate = useNavigate();

  return (
    <div className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <button
          onClick={() => navigate('/student/room')}
          className="p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
        >
          <h3 className="text-lg font-semibold text-gray-900">View My Room</h3>
          <p className="mt-2 text-sm text-gray-600">Check your current room details</p>
        </button>

        <button
          onClick={() => navigate('/student/book')}
          className="p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
        >
          <h3 className="text-lg font-semibold text-gray-900">Book a Room</h3>
          <p className="mt-2 text-sm text-gray-600">Browse and book available rooms</p>
        </button>

        <button
          onClick={() => navigate('/student/bookings')}
          className="p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
        >
          <h3 className="text-lg font-semibold text-gray-900">My Bookings</h3>
          <p className="mt-2 text-sm text-gray-600">View your booking history</p>
        </button>

        <button
          onClick={() => navigate('/student/meal-plan')}
          className="p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
        >
          <h3 className="text-lg font-semibold text-gray-900">Meal Plan</h3>
          <p className="mt-2 text-sm text-gray-600">View and order meals</p>
        </button>
      </div>
    </div>
  );
};

export default StudentDashboard;