import {
  AdminCloseGdprRequestInput,
  AdminListGdprRequestsInput,
  AdminListGdprRequestsOutput,
  ListMyGdprRequestsOutput,
  RequestAccountDeletionInput,
  RequestAccountDeletionOutput,
  SubmitGdprRequestInput,
  SubmitGdprRequestOutput,
  TrackEventInput,
  AdminListPartnersOutput,
  AdminUpsertPartnerInput,
  AdminUpsertPartnerOutput,
  GetSponsoredInput,
  GetSponsoredOutput,
  AcceptDeclarationInput,
  DeleteHomePhotoInput,
  EmptyInput,
  HomeDraftInput,
  HomeOutput,
  PhotosOutput,
  PublishHomeOutput,
  ReorderHomePhotosInput,
  TravelPrefsInput,
  AcceptLegalDocsInput,
  CompleteSignupInput,
  CompleteSignupOutput,
  ConfirmPhoneLinkedInput,
  ConfirmPhoneLinkedOutput,
  OkOutput,
  SignOutEverywhereInput,
  ConfirmWaitlistInput,
  ConfirmWaitlistOutput,
  JoinWaitlistInput,
  JoinWaitlistOutput,
  AdminDashboardOutput,
  AdminDecideLocationReviewInput,
  AdminDecideLocationReviewOutput,
  AdminDecideVerificationInput,
  AdminDecideVerificationOutput,
  AdminGetVerificationFileUrlInput,
  AdminGetVerificationFileUrlOutput,
  AdminGetVerificationInput,
  AdminGetVerificationOutput,
  AdminListLocationReviewsOutput,
  AdminListVerificationsInput,
  AdminListVerificationsOutput,
  GetMyVerificationOutput,
  RequestLocationReviewInput,
  SubmitIdentityVerificationInput,
  SubmitIdentityVerificationOutput,
  VerifyHomeLocationInput,
  VerifyHomeLocationOutput,
  GetDiscoverDeckInput,
  GetDiscoverDeckOutput,
  GetHomeDetailInput,
  GetHomeDetailOutput,
  PassHomeInput,
  SearchHomesInput,
  SearchHomesOutput,
  UndoPassInput,
  BlockUserInput,
  DeleteMessageForMeInput,
  GetMatchContactInput,
  GetMatchContactOutput,
  LikeHomeInput,
  LikeHomeOutput,
  ListBlockedOutput,
  ListLikesReceivedInput,
  ListLikesReceivedOutput,
  MarkConversationReadInput,
  MarkMatchSeenInput,
  SendMessageInput,
  SendMessageOutput,
  SharePhoneInChatInput,
  UnblockUserInput,
  UnmatchInput,
  CreateCheckoutSessionInput,
  DevSimulateStripeInput,
  GetReferralSummaryOutput,
  UrlOutput,
  WithdrawSubscriptionInput,
  WithdrawSubscriptionOutput,
  CancelExchangeInput,
  ExchangeOutput,
  MarkAllNotificationsReadOutput,
  ProposeExchangeInput,
  RegisterPushTokenInput,
  RespondExchangeInput,
  SubmitReviewInput,
  SubmitReviewOutput,
  UnregisterPushTokenInput,
  AdminDecideAppealInput,
  AdminDecideAppealOutput,
  AdminGetReportInput,
  AdminGetReportOutput,
  AdminHandleAlertInput,
  AdminListAlertsOutput,
  AdminListAppealsOutput,
  AdminListHoldsOutput,
  AdminListReportsInput,
  AdminListReportsOutput,
  AdminModerateInput,
  AdminModerateOutput,
  AdminResolveHoldInput,
  GetMyStandingOutput,
  SubmitAppealInput,
  SubmitAppealOutput,
  SubmitReportInput,
  SubmitReportOutput,
  AddComplaintMessageInput,
  AdminListComplaintsInput,
  AdminListComplaintsOutput,
  AdminListFaqsOutput,
  AdminReplyComplaintInput,
  AdminUpsertFaqInput,
  AdminUpsertFaqOutput,
  GetComplaintInput,
  ListMyComplaintsOutput,
  RateFaqInput,
  SubmitComplaintInput,
  SubmitComplaintOutput,
  SubmitPublicReportInput,
  SubmitPublicReportOutput,
  TicketDetail,
  AdminCatalogOutput,
  AdminExportCsvInput,
  AdminGetLegalDocInput,
  AdminGetLegalDocOutput,
  AdminGetMetricsInput,
  AdminGetMetricsOutput,
  AdminGetUserInput,
  AdminGetUserOutput,
  AdminGrantPremiumInput,
  AdminGrantPremiumOutput,
  AdminListAuditInput,
  AdminListAuditOutput,
  AdminParamsOutput,
  AdminPublishLegalDocInput,
  AdminPublishLegalDocOutput,
  AdminSearchUsersInput,
  AdminSearchUsersOutput,
  AdminSetRoleInput,
  AdminSetUserStatusInput,
  AdminUpdateParamsInput,
  AdminUpsertCityInput,
  AdminUpsertWindowInput,
  UrlWithExpiryOutput,
} from '@tinhome/shared/schemas';
import { callable } from './callable';

export { getMe, updateSettings } from './session-api';


export const joinWaitlist = callable('joinWaitlist', JoinWaitlistInput, JoinWaitlistOutput);
export const confirmWaitlist = callable(
  'confirmWaitlist',
  ConfirmWaitlistInput,
  ConfirmWaitlistOutput,
);

export const completeSignup = callable('completeSignup', CompleteSignupInput, CompleteSignupOutput);
export const confirmPhoneLinked = callable(
  'confirmPhoneLinked',
  ConfirmPhoneLinkedInput,
  ConfirmPhoneLinkedOutput,
);
export const acceptLegalDocs = callable('acceptLegalDocs', AcceptLegalDocsInput, OkOutput);
export const signOutEverywhere = callable('signOutEverywhere', SignOutEverywhereInput, OkOutput);

export const upsertHome = callable('upsertHome', HomeDraftInput, HomeOutput);
export const getMyHome = callable('getMyHome', EmptyInput, HomeOutput);
export const reorderHomePhotos = callable(
  'reorderHomePhotos',
  ReorderHomePhotosInput,
  PhotosOutput,
);
export const deleteHomePhoto = callable('deleteHomePhoto', DeleteHomePhotoInput, PhotosOutput);
export const acceptDeclaration = callable('acceptDeclaration', AcceptDeclarationInput, HomeOutput);
export const publishHome = callable('publishHome', EmptyInput, PublishHomeOutput);
export const pauseHome = callable('pauseHome', EmptyInput, HomeOutput);
export const unpauseHome = callable('unpauseHome', EmptyInput, HomeOutput);
export const updateTravelPrefs = callable('updateTravelPrefs', TravelPrefsInput, HomeOutput);

export const submitIdentityVerification = callable(
  'submitIdentityVerification',
  SubmitIdentityVerificationInput,
  SubmitIdentityVerificationOutput,
);
export const getMyVerification = callable('getMyVerification', EmptyInput, GetMyVerificationOutput);
export const verifyHomeLocation = callable(
  'verifyHomeLocation',
  VerifyHomeLocationInput,
  VerifyHomeLocationOutput,
);
export const requestLocationReview = callable(
  'requestLocationReview',
  RequestLocationReviewInput,
  OkOutput,
);

export const adminGetDashboard = callable('adminGetDashboard', EmptyInput, AdminDashboardOutput);
export const adminListVerifications = callable(
  'adminListVerifications',
  AdminListVerificationsInput,
  AdminListVerificationsOutput,
);
export const adminGetVerification = callable(
  'adminGetVerification',
  AdminGetVerificationInput,
  AdminGetVerificationOutput,
);
export const adminGetVerificationFileUrl = callable(
  'adminGetVerificationFileUrl',
  AdminGetVerificationFileUrlInput,
  AdminGetVerificationFileUrlOutput,
);
export const adminDecideVerification = callable(
  'adminDecideVerification',
  AdminDecideVerificationInput,
  AdminDecideVerificationOutput,
);
export const adminListLocationReviews = callable(
  'adminListLocationReviews',
  EmptyInput,
  AdminListLocationReviewsOutput,
);
export const adminDecideLocationReview = callable(
  'adminDecideLocationReview',
  AdminDecideLocationReviewInput,
  AdminDecideLocationReviewOutput,
);

export const getDiscoverDeck = callable(
  'getDiscoverDeck',
  GetDiscoverDeckInput,
  GetDiscoverDeckOutput,
);
export const searchHomes = callable('searchHomes', SearchHomesInput, SearchHomesOutput);
export const getHomeDetail = callable('getHomeDetail', GetHomeDetailInput, GetHomeDetailOutput);
export const passHome = callable('passHome', PassHomeInput, OkOutput);
export const undoPass = callable('undoPass', UndoPassInput, OkOutput);

export const likeHome = callable('likeHome', LikeHomeInput, LikeHomeOutput);
export const listLikesReceived = callable(
  'listLikesReceived',
  ListLikesReceivedInput,
  ListLikesReceivedOutput,
);
export const markMatchSeen = callable('markMatchSeen', MarkMatchSeenInput, OkOutput);
export const unmatch = callable('unmatch', UnmatchInput, OkOutput);
export const getMatchContact = callable(
  'getMatchContact',
  GetMatchContactInput,
  GetMatchContactOutput,
);
export const sharePhoneInChat = callable('sharePhoneInChat', SharePhoneInChatInput, OkOutput);
export const sendMessage = callable('sendMessage', SendMessageInput, SendMessageOutput);
export const markConversationRead = callable(
  'markConversationRead',
  MarkConversationReadInput,
  OkOutput,
);
export const deleteMessageForMe = callable('deleteMessageForMe', DeleteMessageForMeInput, OkOutput);
export const blockUser = callable('blockUser', BlockUserInput, OkOutput);
export const unblockUser = callable('unblockUser', UnblockUserInput, OkOutput);
export const listBlocked = callable('listBlocked', EmptyInput, ListBlockedOutput);

export const createCheckoutSession = callable('createCheckoutSession', CreateCheckoutSessionInput, UrlOutput);
export const createPortalSession = callable('createPortalSession', EmptyInput, UrlOutput);
export const withdrawSubscription = callable('withdrawSubscription', WithdrawSubscriptionInput, WithdrawSubscriptionOutput);
export const getReferralSummary = callable('getReferralSummary', EmptyInput, GetReferralSummaryOutput);
export const devSimulateStripe = callable('devSimulateStripe', DevSimulateStripeInput, OkOutput);

export const proposeExchange = callable('proposeExchange', ProposeExchangeInput, ExchangeOutput);
export const respondExchange = callable('respondExchange', RespondExchangeInput, ExchangeOutput);
export const cancelExchange = callable('cancelExchange', CancelExchangeInput, ExchangeOutput);
export const submitReview = callable('submitReview', SubmitReviewInput, SubmitReviewOutput);
export const markAllNotificationsRead = callable(
  'markAllNotificationsRead',
  EmptyInput,
  MarkAllNotificationsReadOutput,
);
export const registerPushToken = callable('registerPushToken', RegisterPushTokenInput, OkOutput);
export const unregisterPushToken = callable(
  'unregisterPushToken',
  UnregisterPushTokenInput,
  OkOutput,
);

export const submitReport = callable('submitReport', SubmitReportInput, SubmitReportOutput);
export const submitAppeal = callable('submitAppeal', SubmitAppealInput, SubmitAppealOutput);
export const getMyStanding = callable('getMyStanding', EmptyInput, GetMyStandingOutput);
export const adminListReports = callable(
  'adminListReports',
  AdminListReportsInput,
  AdminListReportsOutput,
);
export const adminGetReport = callable('adminGetReport', AdminGetReportInput, AdminGetReportOutput);
export const adminModerate = callable('adminModerate', AdminModerateInput, AdminModerateOutput);
export const adminListAppeals = callable('adminListAppeals', EmptyInput, AdminListAppealsOutput);
export const adminDecideAppeal = callable(
  'adminDecideAppeal',
  AdminDecideAppealInput,
  AdminDecideAppealOutput,
);
export const adminListHolds = callable('adminListHolds', EmptyInput, AdminListHoldsOutput);
export const adminResolveHold = callable('adminResolveHold', AdminResolveHoldInput, OkOutput);
export const adminListAlerts = callable('adminListAlerts', EmptyInput, AdminListAlertsOutput);
export const adminHandleAlert = callable('adminHandleAlert', AdminHandleAlertInput, OkOutput);

export const submitComplaint = callable('submitComplaint', SubmitComplaintInput, SubmitComplaintOutput);
export const listMyComplaints = callable('listMyComplaints', EmptyInput, ListMyComplaintsOutput);
export const getComplaint = callable('getComplaint', GetComplaintInput, TicketDetail);
export const addComplaintMessage = callable('addComplaintMessage', AddComplaintMessageInput, OkOutput);
export const adminListComplaints = callable(
  'adminListComplaints',
  AdminListComplaintsInput,
  AdminListComplaintsOutput,
);
export const adminGetComplaint = callable('adminGetComplaint', GetComplaintInput, TicketDetail);
export const adminReplyComplaint = callable('adminReplyComplaint', AdminReplyComplaintInput, OkOutput);
export const rateFaq = callable('rateFaq', RateFaqInput, OkOutput);
export const adminListFaqs = callable('adminListFaqs', EmptyInput, AdminListFaqsOutput);
export const adminUpsertFaq = callable('adminUpsertFaq', AdminUpsertFaqInput, AdminUpsertFaqOutput);
export const submitPublicReport = callable(
  'submitPublicReport',
  SubmitPublicReportInput,
  SubmitPublicReportOutput,
);

export const adminSearchUsers = callable('adminSearchUsers', AdminSearchUsersInput, AdminSearchUsersOutput);
export const adminGetUser = callable('adminGetUser', AdminGetUserInput, AdminGetUserOutput);
export const adminGrantPremium = callable('adminGrantPremium', AdminGrantPremiumInput, AdminGrantPremiumOutput);
export const adminSetUserStatus = callable('adminSetUserStatus', AdminSetUserStatusInput, OkOutput);
export const adminSetRole = callable('adminSetRole', AdminSetRoleInput, OkOutput);
export const adminGetCatalog = callable('adminGetCatalog', EmptyInput, AdminCatalogOutput);
export const adminUpsertCity = callable('adminUpsertCity', AdminUpsertCityInput, OkOutput);
export const adminUpsertWindow = callable('adminUpsertWindow', AdminUpsertWindowInput, OkOutput);
export const adminGetParams = callable('adminGetParams', EmptyInput, AdminParamsOutput);
export const adminUpdateParams = callable('adminUpdateParams', AdminUpdateParamsInput, AdminParamsOutput);
export const adminGetLegalDoc = callable('adminGetLegalDoc', AdminGetLegalDocInput, AdminGetLegalDocOutput);
export const adminPublishLegalDoc = callable(
  'adminPublishLegalDoc',
  AdminPublishLegalDocInput,
  AdminPublishLegalDocOutput,
);
export const adminGetMetrics = callable('adminGetMetrics', AdminGetMetricsInput, AdminGetMetricsOutput);
export const adminExportCsv = callable('adminExportCsv', AdminExportCsvInput, UrlWithExpiryOutput);
export const adminListAudit = callable('adminListAudit', AdminListAuditInput, AdminListAuditOutput);

export const getSponsored = callable('getSponsored', GetSponsoredInput, GetSponsoredOutput);
export const adminListPartners = callable('adminListPartners', EmptyInput, AdminListPartnersOutput);
export const adminUpsertPartner = callable(
  'adminUpsertPartner',
  AdminUpsertPartnerInput,
  AdminUpsertPartnerOutput,
);

export const submitGdprRequest = callable(
  'submitGdprRequest',
  SubmitGdprRequestInput,
  SubmitGdprRequestOutput,
);
export const listMyGdprRequests = callable('listMyGdprRequests', EmptyInput, ListMyGdprRequestsOutput);
export const exportMyData = callable('exportMyData', EmptyInput, UrlWithExpiryOutput);
export const requestAccountDeletion = callable(
  'requestAccountDeletion',
  RequestAccountDeletionInput,
  RequestAccountDeletionOutput,
);
export const trackEvent = callable('trackEvent', TrackEventInput, OkOutput);
export const adminListGdprRequests = callable(
  'adminListGdprRequests',
  AdminListGdprRequestsInput,
  AdminListGdprRequestsOutput,
);
export const adminCloseGdprRequest = callable(
  'adminCloseGdprRequest',
  AdminCloseGdprRequestInput,
  OkOutput,
);
