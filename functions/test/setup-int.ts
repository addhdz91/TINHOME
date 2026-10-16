import { setSessionCheck } from '../src/core/privileged-session.js';

// Most integration tests use made-up tokens (no Auth account): accept them here. The real
// live checks are covered by privileged-session.int.test.ts.
setSessionCheck(() => Promise.resolve());
