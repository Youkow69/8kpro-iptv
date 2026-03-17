import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Player from './Player';
import { useDpadNavigation } from '../hooks/useDpadNavigation';

export default function Layout() {
  useDpadNavigation();

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <main className="flex-1 flex flex-col pb-16 md:pb-0 overflow-hidden">
        <Outlet />
      </main>
      <Player />
    </div>
  );
}
