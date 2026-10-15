import { setPrivilegedSessionCheck } from '../src/core/privileged-session.js';

// Most integration tests use made-up admin tokens (no Auth account): accept them here. The
// real live check is covered by privileged-session.int.test.ts.
setPrivilegedSessionCheck(() => Promise.resolve());
