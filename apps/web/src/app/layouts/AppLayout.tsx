import { Outlet } from 'react-router';

/** Signed-in area. `AppShell` (C-01), session and route guards arrive in M2. */
export function AppLayout() {
  return (
    <div className="min-h-dvh">
      <Outlet />
    </div>
  );
}
