/**
 * Entry point: only exports deployable functions (docs/08_IMPLEMENTATION_PLAN.md).
 */
export { onMailQueued } from './modules/mail/triggers.js';
export { confirmWaitlist, joinWaitlist } from './modules/waitlist/callables.js';
