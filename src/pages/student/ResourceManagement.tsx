import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { FiAlertCircle, FiTrendingUp, FiTrendingDown } from 'react-icons/fi';
import { RiLeafLine, RiWaterFlashLine } from 'react-icons/ri';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface ResourceUsage {
  id: string;
  electricity_kwh: number;
  water_liters: number;
  date: string;
}

interface Room {
  id: string;
  room_number: string;
  floor: number;
  capacity: number;
  price_per_month: number;
}

interface RoomAllocation {
  id: string;
  room: Room;
  start_date: string;
  end_date: string | null;
}

interface RoomAllocationResponse {
  id: string;
  start_date: string;
  end_date: string | null;
  rooms: Room;
}

const ResourceManagement = () => {
  const [roomNumber, setRoomNumber] = useState<string | null>(null);
  const [usageHistory, setUsageHistory] = useState<ResourceUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    electricity_kwh: '',
    water_liters: ''
  });

  useEffect(() => {
    fetchStudentRoom();
    fetchUsageHistory();
  }, []);

  const fetchStudentRoom = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: allocationData, error: allocationError } = await supabase
        .from('room_allocations')
        .select(`
          id,
          start_date,
          end_date,
          rooms!inner (
            id,
            room_number,
            floor,
            capacity,
            price_per_month
          )
        `)
        .eq('student_id', user.id)
        .is('end_date', null)
        .maybeSingle();

      if (allocationError) {
        console.error('Error fetching allocation:', allocationError);
        return;
      }

      if (allocationData) {
        const typedData = allocationData as unknown as RoomAllocationResponse;
        setRoomNumber(typedData.rooms.room_number);
      }
    } catch (error) {
      console.error('Error fetching room:', error);
    }
  };

  const fetchUsageHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('resource_usage')
        .select('*')
        .eq('student_id', user.id)
        .order('date', { ascending: false })
        .limit(30);

      if (error) throw error;
      setUsageHistory(data || []);
    } catch (err) {
      console.error('Error fetching usage history:', err);
      setError('Failed to fetch usage history');
    } finally {
      setLoading(false);
    }
  };

  const generateRecommendations = (currentUsage: { electricity_kwh: number; water_liters: number }) => {
    const recommendations: string[] = [];
    
    // Electricity recommendations based on usage patterns
    if (currentUsage.electricity_kwh > 10) {
      recommendations.push('Consider using natural light during daytime');
      recommendations.push('Turn off lights and appliances when not in use');
      recommendations.push('Use energy-efficient LED bulbs');
    }
    
    if (currentUsage.electricity_kwh > 15) {
      recommendations.push('Minimize the use of high-power appliances during peak hours');
      recommendations.push('Check for any devices that might be consuming standby power');
    }

    // Water recommendations based on usage patterns
    if (currentUsage.water_liters > 200) {
      recommendations.push('Take shorter showers to reduce water consumption');
      recommendations.push('Fix any leaking taps or pipes immediately');
      recommendations.push('Use water-efficient washing techniques');
    }
    
    if (currentUsage.water_liters > 300) {
      recommendations.push('Consider collecting and reusing greywater for plants');
      recommendations.push('Install water-saving aerators on taps');
    }

    // General recommendations
    recommendations.push('Track your usage patterns to identify peak consumption times');
    recommendations.push('Set personal goals for reducing resource consumption');

    return recommendations;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNumber) {
      setError('You must have an allocated room to submit resource usage');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const electricity_kwh = parseFloat(formData.electricity_kwh);
      const water_liters = parseFloat(formData.water_liters);

      const { error: submitError } = await supabase
        .from('resource_usage')
        .insert({
          student_id: user.id,
          room_number: roomNumber,
          electricity_kwh,
          water_liters,
          date: new Date().toISOString().split('T')[0]
        });

      if (submitError) throw submitError;

      // Generate AI recommendations based on the new usage data
      const newRecommendations = generateRecommendations({
        electricity_kwh,
        water_liters
      });
      setRecommendations(newRecommendations);

      // Reset form and refresh history
      setFormData({
        electricity_kwh: '',
        water_liters: ''
      });
      await fetchUsageHistory();

    } catch (err) {
      console.error('Error submitting usage:', err);
      setError('Failed to submit resource usage');
    } finally {
      setSubmitting(false);
    }
  };

  const chartData = {
    labels: usageHistory.map(usage => new Date(usage.date).toLocaleDateString()).reverse(),
    datasets: [
      {
        label: 'Electricity (kWh)',
        data: usageHistory.map(usage => usage.electricity_kwh).reverse(),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
      },
      {
        label: 'Water (Liters)',
        data: usageHistory.map(usage => usage.water_liters).reverse(),
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Resource Usage History',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Resource Management</h1>
        <p className="mt-1 text-sm text-gray-600">Track and optimize your room's resource consumption</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Daily Usage Input</h2>
          
          {!roomNumber && (
            <div className="mb-6 flex items-start space-x-2 text-yellow-700 bg-yellow-50 p-4 rounded-lg">
              <FiAlertCircle className="w-5 h-5 mt-0.5" />
              <p className="text-sm">You need to have an allocated room to submit resource usage.</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="electricity_kwh" className="block text-sm font-medium text-gray-700 mb-1">
                Electricity Usage (kWh)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <RiLeafLine className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="electricity_kwh"
                  type="number"
                  step="0.01"
                  required
                  value={formData.electricity_kwh}
                  onChange={(e) => setFormData({ ...formData, electricity_kwh: e.target.value })}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  placeholder="Enter electricity usage"
                />
              </div>
            </div>

            <div>
              <label htmlFor="water_liters" className="block text-sm font-medium text-gray-700 mb-1">
                Water Usage (Liters)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <RiWaterFlashLine className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="water_liters"
                  type="number"
                  step="0.01"
                  required
                  value={formData.water_liters}
                  onChange={(e) => setFormData({ ...formData, water_liters: e.target.value })}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter water usage"
                />
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}

            <button
              type="submit"
              disabled={submitting || !roomNumber}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit Usage'}
            </button>
          </form>
        </div>

        {/* AI Recommendations */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Smart Recommendations</h2>
          
          {recommendations.length > 0 ? (
            <div className="space-y-4">
              {recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                  <div className="flex-shrink-0">
                    {index % 2 === 0 ? (
                      <FiTrendingDown className="h-5 w-5 text-green-600" />
                    ) : (
                      <FiTrendingUp className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                  <p className="text-sm text-green-700">{recommendation}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <p>Submit your daily usage to get personalized recommendations</p>
            </div>
          )}
        </div>
      </div>

      {/* Usage History Chart */}
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Usage History</h2>
        {usageHistory.length > 0 ? (
          <div className="h-[400px]">
            <Line options={chartOptions} data={chartData} />
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            <p>No usage history available</p>
            <p className="text-sm mt-1">Start tracking your resource usage to see trends</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResourceManagement;