import { Outlet } from 'react-router';

/** Admin area (separate chunk). Role + TOTP guard arrives in M4; until then it shows nothing. */
export function AdminLayout() {
  return (
    <div className="min-h-dvh">
      <Outlet />
    </div>
  );
}
