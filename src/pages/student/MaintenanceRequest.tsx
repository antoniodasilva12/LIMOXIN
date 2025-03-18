import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { FiAlertCircle, FiTool } from 'react-icons/fi';
import { analyzeMaintenanceIssue } from '../../services/maintenanceAI';

interface Room {
  room_number: string;
}

interface RoomAllocation {
  rooms: Room;
}

interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  room_number: string;
}

interface QuickFix {
  title: string;
  steps: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  tools_needed: string[];
}

const MaintenanceRequest = () => {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roomNumber, setRoomNumber] = useState<string | null>(null);
  const [quickFixes, setQuickFixes] = useState<QuickFix[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'low' as MaintenanceRequest['priority']
  });

  useEffect(() => {
    fetchRequests();
    fetchStudentRoom();
  }, []);

  const fetchStudentRoom = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: allocation } = await supabase
        .from('room_allocations')
        .select(`
          rooms (
            room_number
          )
        `)
        .eq('student_id', user.id)
        .is('end_date', null)
        .single();

      if (allocation && allocation.rooms && 'room_number' in allocation.rooms) {
        setRoomNumber((allocation as unknown as RoomAllocation).rooms.room_number);
      }
    } catch (error) {
      console.error('Error fetching room:', error);
    }
  };

  const fetchRequests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      console.error('Error fetching requests:', err);
      setError('Failed to fetch maintenance requests');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNumber) {
      setError('You must have an allocated room to submit maintenance requests');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get AI suggestions for quick fixes before submission
      const suggestions = await analyzeMaintenanceIssue(formData.title, formData.description);
      setQuickFixes(suggestions); // Set quick fixes before database insertion

      const { error: submitError } = await supabase
        .from('maintenance_requests')
        .insert({
          student_id: user.id,
          room_number: roomNumber,
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          status: 'pending'
        });

      if (submitError) throw submitError;
      
      // Reset form and refresh requests
      setFormData({
        title: '',
        description: '',
        priority: 'low'
      });
      setError(null); // Clear any previous errors
      setQuickFixes(suggestions); // Set quick fixes after successful submission
      await fetchRequests();

    } catch (err) {
      console.error('Error submitting request:', err);
      setError('Failed to submit maintenance request');
    } finally {
      setSubmitting(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Fixes Section */}
        {quickFixes.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Quick Fix Suggestions</h2>
            <div className="space-y-6">
              {quickFixes.map((fix, index) => (
                <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                  <h3 className="text-lg font-semibold text-gray-900">{fix.title}</h3>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        fix.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                        fix.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {fix.difficulty.charAt(0).toUpperCase() + fix.difficulty.slice(1)} Difficulty
                      </span>
                    </div>
                    <div className="mt-2">
                      <h4 className="text-sm font-medium text-gray-700">Steps:</h4>
                      <ol className="mt-1 list-decimal list-inside text-sm text-gray-600">
                        {fix.steps.map((step, stepIndex) => (
                          <li key={stepIndex} className="py-1">{step}</li>
                        ))}
                      </ol>
                    </div>
                    <div className="mt-2">
                      <h4 className="text-sm font-medium text-gray-700">Tools Needed:</h4>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {fix.tools_needed.map((tool, toolIndex) => (
                          <span key={toolIndex} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            <FiTool className="w-3 h-3 mr-1" />
                            {tool}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Submit Request Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Submit Maintenance Request</h2>
          
          {!roomNumber && (
            <div className="mb-6 flex items-start space-x-2 text-yellow-700 bg-yellow-50 p-4 rounded-lg">
              <FiAlertCircle className="w-5 h-5 mt-0.5" />
              <p className="text-sm">You need to have an allocated room to submit maintenance requests.</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="issue_title" className="block text-sm font-medium text-gray-700 mb-1">
                Issue Title
              </label>
              <input
                id="issue_title"
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Broken Light Fixture"
              />
            </div>

            <div>
              <label htmlFor="issue_description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="issue_description"
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Please provide detailed description of the issue..."
              />
            </div>

            <div>
              <label htmlFor="priority_level" className="block text-sm font-medium text-gray-700 mb-1">
                Priority Level
              </label>
              <select
                id="priority_level"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'low' | 'medium' | 'high' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>

            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}

            <button
              type="submit"
              disabled={submitting || !roomNumber}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>

          {/* Quick Fix Suggestions */}
          {quickFixes.length > 0 && (
            <div className="mt-6 border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FiTool className="w-5 h-5 mr-2" />
                Quick Fix Suggestions
              </h3>
              <div className="space-y-4">
                {quickFixes.map((fix, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">{fix.title}</h4>
                    <div className="mb-2">
                      <span className={`inline-block px-2 py-1 text-sm rounded ${fix.difficulty === 'easy' ? 'bg-green-100 text-green-800' : fix.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                        {fix.difficulty.charAt(0).toUpperCase() + fix.difficulty.slice(1)} Difficulty
                      </span>
                    </div>
                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-700 mb-1">Required Tools:</p>
                      <div className="flex flex-wrap gap-2">
                        {fix.tools_needed.map((tool, toolIndex) => (
                          <span key={toolIndex} className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                            {tool}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Steps:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        {fix.steps.map((step, stepIndex) => (
                          <li key={stepIndex} className="text-sm text-gray-600">{step}</li>
                        ))}
                      </ol>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick Fixes */}
        {submitting && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Generating quick fix suggestions...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 rounded-lg shadow p-6 mb-6">
            <div className="flex items-start space-x-2 text-red-700">
              <FiAlertCircle className="w-5 h-5 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {quickFixes.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Fix Suggestions</h2>
            <div className="space-y-4">
              {quickFixes.map((fix, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-2">{fix.title}</h3>
                  <div className="mb-3">
                    <span className={`inline-block px-2 py-1 text-sm rounded ${fix.difficulty === 'easy' ? 'bg-green-100 text-green-800' : fix.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                      {fix.difficulty.charAt(0).toUpperCase() + fix.difficulty.slice(1)} Difficulty
                    </span>
                  </div>
                  <div className="mb-3">
                    <h4 className="font-medium mb-1">Steps:</h4>
                    <ol className="list-decimal list-inside space-y-1">
                      {fix.steps.map((step, stepIndex) => (
                        <li key={stepIndex} className="text-gray-700">{step}</li>
                      ))}
                    </ol>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Tools Needed:</h4>
                    <div className="flex flex-wrap gap-2">
                      {fix.tools_needed.map((tool, toolIndex) => (
                        <span key={toolIndex} className="inline-flex items-center px-2 py-1 rounded bg-gray-100 text-gray-700 text-sm">
                          <FiTool className="w-4 h-4 mr-1" />
                          {tool}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Maintenance Requests List */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Request History</h2>
          
          {requests.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p>No maintenance requests found.</p>
              <p className="text-sm mt-1">Submit a new request using the form.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div key={request.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900">{request.title}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(request.status)}`}>
                      {request.status.replace('_', ' ').charAt(0).toUpperCase() + request.status.slice(1)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{request.description}</p>
                  <div className="flex justify-between items-center text-sm">
                    <span className={`font-medium ${getPriorityColor(request.priority)}`}>
                      {request.priority.charAt(0).toUpperCase() + request.priority.slice(1)} Priority
                    </span>
                    <span className="text-gray-500">
                      {new Date(request.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MaintenanceRequest;