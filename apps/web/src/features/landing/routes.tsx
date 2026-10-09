import type { RouteObject } from 'react-router';
import { LandingPage } from './pages/LandingPage';

/**
 * The landing is the entry page: rendered eagerly (no extra round trip before the LCP).
 * Its data sections are lazy inside the page.
 */
export const landingRoutes: RouteObject[] = [{ index: true, element: <LandingPage /> }];
