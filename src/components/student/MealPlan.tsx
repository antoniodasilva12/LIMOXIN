import React, { useState, useEffect } from 'react';
import { useUser } from '@supabase/auth-helpers-react';
import { format } from 'date-fns';
import { supabase } from '../../services/supabase';
import { MealRecommendationAI } from '../../services/mealRecommendationAI';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  nutritional_info: any;
}

interface MealPlan {
  id: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  menu_item_id: string;
  serving_date: string;
  serving_time: string;
  capacity: number;
  current_orders: number;
  menu_item?: MenuItem;
}

const MealPlan: React.FC = () => {
  const user = useUser();
  const [date, setDate] = useState(new Date());
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [recommendations, setRecommendations] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  const mealRecommendationInstance = MealRecommendationAI.getInstance();

  useEffect(() => {
    if (user) {
      fetchMealPlans();
      fetchRecommendations();
    }
  }, [user, date]);

  const fetchMealPlans = async () => {
    try {
      const { data: plans, error } = await supabase
        .from('meal_plans')
        .select(`
          *,
          menu_item:menu_items(*)
        `)
        .eq('serving_date', format(date, 'yyyy-MM-dd'));

      if (error) throw error;
      setMealPlans(plans || []);
    } catch (error) {
      console.error('Error fetching meal plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendations = async () => {
    if (!user) return;
    try {
      const recommendations = await mealRecommendationInstance.getPersonalizedRecommendations(
        user.id,
        format(date, 'yyyy-MM-dd')
      );
      setRecommendations(recommendations);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    }
  };

  const placeOrder = async (mealPlanId: string) => {
    try {
      const { data, error } = await supabase
        .from('meal_orders')
        .insert({
          student_id: user?.id,
          meal_plan_id: mealPlanId,
          status: 'pending'
        });

      if (error) throw error;
      fetchMealPlans(); // Refresh meal plans
    } catch (error) {
      console.error('Error placing order:', error);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Meal Plan</h2>
      
      {/* Date Selector */}
      <div className="mb-6">
        <input
          type="date"
          value={format(date, 'yyyy-MM-dd')}
          onChange={(e) => setDate(new Date(e.target.value))}
          className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mealPlans.map((plan) => (
            <div key={plan.id} className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-2 capitalize">{plan.meal_type}</h3>
              {plan.menu_item && (
                <>
                  <p className="text-gray-600 mb-2">{plan.menu_item.name}</p>
                  <p className="text-sm text-gray-500 mb-4">{plan.menu_item.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-600 font-medium">${plan.menu_item.price}</span>
                    <button
                      onClick={() => placeOrder(plan.id)}
                      className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      Order
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4">Recommended for You</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendations.map((item) => (
              <div key={item.id} className="bg-white rounded-lg shadow p-6">
                <h4 className="text-lg font-medium mb-2">{item.name}</h4>
                <p className="text-gray-600 mb-2">{item.description}</p>
                <span className="text-blue-600 font-medium">${item.price}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MealPlan;