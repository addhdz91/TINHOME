/**
 * Entry point: only exports deployable functions (docs/08_IMPLEMENTATION_PLAN.md).
 */
export {
  acceptLegalDocs,
  completeSignup,
  confirmPhoneLinked,
  getMe,
  signOutEverywhere,
  updateSettings,
} from './modules/account/callables.js';
export { onMailQueued } from './modules/mail/triggers.js';
export { confirmWaitlist, joinWaitlist } from './modules/waitlist/callables.js';
