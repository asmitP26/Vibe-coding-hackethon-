import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import BottomNav from './BottomNav';
import GradientOrbs from './GradientOrbs';
import FloatingAssistant from '../assistant/FloatingAssistant';
import Toast from '../common/Toast';
import VoiceOverlay from '../common/VoiceOverlay';
import ErrorBoundary from '../common/ErrorBoundary';
import OnboardingModal from '../onboarding/OnboardingModal';
import { VoiceProvider } from '../../context/VoiceContext';
import { useReminderEngine } from '../../hooks/useReminderEngine';

export default function AppShell() {
  const location = useLocation();

  // Poll for due task reminders while the app is open (fires sound + toast +
  // desktop notification + adds them to the notifications panel).
  useReminderEngine();

  return (
    <VoiceProvider>
      <div className="relative min-h-screen">
        <GradientOrbs />
        <div className="mx-auto flex w-full max-w-[1440px]">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar />
            <main className="px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12">
              {/*
               * The page content is rendered plainly and is ALWAYS visible.
               * We deliberately do not wrap it in an opacity/scale entrance
               * animation here: a route-level JS animation can be interrupted by
               * rapid navigation (or an inactive tab) and leave the wrapper stuck
               * at its initial state (opacity 0), which blanks the whole page.
               * Each page provides its own entrance animation instead.
               * Keying on the pathname forces a clean remount per route.
               */}
              <div key={location.pathname} className="animate-page-in">
                <ErrorBoundary key={location.pathname} label="This page">
                  <Outlet />
                </ErrorBoundary>
              </div>
            </main>
          </div>
        </div>
        <BottomNav />
        <FloatingAssistant />
        <Toast />
        <VoiceOverlay />
        <OnboardingModal />
      </div>
    </VoiceProvider>
  );
}
