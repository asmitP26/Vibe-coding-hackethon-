import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import Button from '../common/Button';
import MicButton from '../common/MicButton';
import Logo from './Logo';
import TopbarSearch from './TopbarSearch';
import NotificationBell from './NotificationBell';
import ProfileMenu from './ProfileMenu';

export default function Topbar() {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-100 bg-white/70 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="lg:hidden">
        <Logo compact />
      </div>

      <TopbarSearch />

      <div className="ml-auto flex items-center gap-2">
        <Button onClick={() => navigate('/planner')} className="hidden sm:inline-flex">
          <Sparkles className="h-4 w-4" />
          Plan My Day
        </Button>

        <MicButton title="Voice command" />
        <NotificationBell />
        <ProfileMenu />
      </div>
    </header>
  );
}

