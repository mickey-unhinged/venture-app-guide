import { useNavigate } from 'react-router-dom';
import { Camera } from 'lucide-react';
import StudentNav from '@/components/StudentNav';

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-foreground mb-6">Dashboard</h1>
        
        <div className="space-y-6">
          <div className="bg-card rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
            <button
              onClick={() => navigate('/student/scan')}
              className="w-full flex items-center justify-center gap-3 bg-primary text-white py-4 rounded-lg font-medium hover:opacity-90"
            >
              <Camera size={24} />
              Scan QR Code
            </button>
          </div>

          <div className="bg-card rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground mb-2">Attendance Overview</h2>
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">0%</div>
                <p className="text-secondary text-sm">Overall Attendance</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground mb-3">Today's Classes</h2>
            <p className="text-secondary text-sm">No classes scheduled for today</p>
          </div>
        </div>
      </div>
      
      <StudentNav />
    </div>
  );
}
