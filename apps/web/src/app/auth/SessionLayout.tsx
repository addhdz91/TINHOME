import { Outlet } from 'react-router';
import { AuthProvider } from './AuthProvider';

/** Mounts the session (Firebase Auth + Me) for the auth pages and the app, not the landing. */
export function SessionLayout() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}
