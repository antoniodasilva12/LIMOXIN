import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';

interface Room {
  id: string;
  room_number: string;
  floor: number;
  capacity: number;
  price_per_month: number;
  type: string;
  is_occupied: boolean;
}

const BookRoom = () => {
  const [loading, setLoading] = useState(true);
  const [hasAllocation, setHasAllocation] = useState(false);
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [bookingInProgress, setBookingInProgress] = useState(false);

  useEffect(() => {
    checkAllocationAndFetchRooms();
  }, []);

  const checkAllocationAndFetchRooms = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if student has an allocation
      const { data: allocation, error: allocationError } = await supabase
        .from('room_allocations')
        .select('id')
        .eq('student_id', user.id)
        .is('end_date', null)
        .single();

      if (allocationError && allocationError.code !== 'PGRST116') {
        throw allocationError;
      }

      if (allocation) {
        setHasAllocation(true);
        return;
      }

      // If no allocation, fetch available rooms
      const { data: rooms, error: roomsError } = await supabase
        .from('rooms')
        .select('*')
        .eq('is_occupied', false)
        .order('room_number');

      if (roomsError) throw roomsError;
      setAvailableRooms(rooms || []);
      
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to fetch room details');
    } finally {
      setLoading(false);
    }
  };

  const handleBookRoom = async (roomId: string) => {
    try {
      setBookingInProgress(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Start a transaction by using multiple operations
      const { error: bookingError } = await supabase
        .from('room_allocations')
        .insert({
          student_id: user.id,
          room_id: roomId,
          start_date: new Date().toISOString(),
          end_date: null
        });

      if (bookingError) throw bookingError;

      // Update room status
      const { error: updateError } = await supabase
        .from('rooms')
        .update({ is_occupied: true })
        .eq('id', roomId);

      if (updateError) throw updateError;

      // Refresh the data
      await checkAllocationAndFetchRooms();
      
    } catch (err) {
      console.error('Error booking room:', err);
      setError('Failed to book room. Please try again.');
    } finally {
      setBookingInProgress(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  if (hasAllocation) {
    return (
      <div className="p-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Book a Room</h2>
          <div className="text-center">
            <p className="text-gray-600 mb-2">
              You already have an active room allocation.
            </p>
            <p className="text-sm text-gray-500">
              You cannot book another room while you have an active allocation.
              Please contact the hostel administration if you need to change rooms.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Available Rooms</h2>
          
          {availableRooms.length === 0 ? (
            <div className="text-center text-gray-600">
              <p className="mb-2">No rooms are available for booking at the moment.</p>
              <p className="text-sm text-gray-500">Please check back later or contact the administration.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableRooms.map((room) => (
                <div key={room.id} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
                  <h3 className="text-lg font-semibold text-gray-900">Room {room.room_number}</h3>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-gray-600">Floor: {room.floor}</p>
                    <p className="text-sm text-gray-600">Capacity: {room.capacity} persons</p>
                    <p className="text-sm text-gray-600">Type: {room.type || 'Standard'}</p>
                    <p className="text-sm font-medium text-green-600">
                      ${room.price_per_month}/month
                    </p>
                  </div>
                  <button
                    onClick={() => handleBookRoom(room.id)}
                    disabled={bookingInProgress}
                    className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {bookingInProgress ? 'Booking...' : 'Book Now'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookRoom; 