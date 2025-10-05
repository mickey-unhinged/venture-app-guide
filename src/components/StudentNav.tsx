import { NavLink } from 'react-router-dom';
import { Home, Camera, ClipboardList, User } from 'lucide-react';

export default function StudentNav() {
  const navItems = [
    { to: '/student/dashboard', icon: Home, label: 'Home' },
    { to: '/student/scan', icon: Camera, label: 'Scan' },
    { to: '/student/attendance', icon: ClipboardList, label: 'Attendance' },
    { to: '/student/profile', icon: User, label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border">
      <div className="flex justify-around items-center h-16">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 h-full ${
                isActive ? 'text-primary' : 'text-secondary'
              }`
            }
          >
            <Icon size={24} />
            <span className="text-xs mt-1">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
