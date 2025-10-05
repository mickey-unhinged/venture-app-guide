import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import StudentNav from '@/components/StudentNav';

export default function Profile() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-foreground mb-6">Profile</h1>
        
        <div className="space-y-4">
          <div className="bg-card rounded-lg p-6 shadow-sm">
            <p className="text-secondary text-sm mb-4">Account Settings</p>
          </div>

          <button
            onClick={handleLogout}
            className="w-full py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </div>
      
      <StudentNav />
    </div>
  );
}
