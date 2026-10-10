import { AdminDashboardOutput, EmptyInput } from '@tinhome/shared/schemas';
import { defineCallable } from '../../core/callable.js';
import { db } from '../../core/firebase.js';
import { requireAdmin } from '../../core/guards.js';
import { getParams } from '../../core/params.js';
import { dashboard } from './dashboard.js';

/** FR-49 — ADM. */
export const adminGetDashboard = defineCallable(
  'adminGetDashboard',
  { input: EmptyInput, output: AdminDashboardOutput },
  async ({ request, now }) => {
    requireAdmin(request);
    return dashboard(db(), await getParams(), now);
  },
);
