import { Outlet } from 'react-router-dom';
import Navbar from '../components/navigation/Navbar';
import FirebaseSetupBanner from '../components/common/FirebaseSetupBanner';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <FirebaseSetupBanner />
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
