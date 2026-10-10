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
export {
  getDiscoverDeck,
  getHomeDetail,
  passHome,
  searchHomes,
  undoPass,
} from './modules/discover/callables.js';
export {
  acceptDeclaration,
  deleteHomePhoto,
  getMyHome,
  pauseHome,
  publishHome,
  reorderHomePhotos,
  unpauseHome,
  updateTravelPrefs,
  upsertHome,
} from './modules/home/callables.js';
export { onHomePhotoUploaded } from './modules/home/triggers.js';
export { adminGetDashboard } from './modules/admin/callables.js';
export {
  adminDecideLocationReview,
  adminDecideVerification,
  adminGetVerification,
  adminGetVerificationFileUrl,
  adminListLocationReviews,
  adminListVerifications,
  getMyVerification,
  jobPurgeLocationCoordinates,
  jobPurgeVerificationFiles,
  requestLocationReview,
  submitIdentityVerification,
  verifyHomeLocation,
} from './modules/verification/callables.js';
export { onMailQueued } from './modules/mail/triggers.js';
export { confirmWaitlist, joinWaitlist } from './modules/waitlist/callables.js';
