import StudentNav from '@/components/StudentNav';

export default function Attendance() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-foreground mb-6">Attendance History</h1>
        
        <div className="bg-card rounded-lg p-6 shadow-sm">
          <p className="text-secondary text-center">No attendance records yet</p>
        </div>
      </div>
      
      <StudentNav />
    </div>
  );
}
