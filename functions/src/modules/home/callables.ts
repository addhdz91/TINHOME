import {
  AcceptDeclarationInput,
  DeleteHomePhotoInput,
  EmptyInput,
  HomeDraftInput,
  HomeOutput,
  PhotosOutput,
  PublishHomeOutput,
  ReorderHomePhotosInput,
  TravelPrefsInput,
} from '@tinhome/shared/schemas';
import { defineCallable } from '../../core/callable.js';
import { db } from '../../core/firebase.js';
import { verifiedUid } from '../../core/guards.js';
import { getParams } from '../../core/params.js';
import { requestIp } from '../../core/rate-limit.js';
import * as homes from './service.js';

/** FR-10 — A, EV, ACT. */
export const upsertHome = defineCallable(
  'upsertHome',
  { input: HomeDraftInput, output: HomeOutput },
  async ({ input, request, now }) => ({
    home: await homes.upsertHome(db(), verifiedUid(request), input, await getParams(), now),
  }),
);

/** Owner view of the home (used by «Mi casa» and the onboarding). A, EV. */
export const getMyHome = defineCallable(
  'getMyHome',
  { input: EmptyInput, output: HomeOutput },
  async ({ request }) => ({
    home: await homes.ownerView(db(), verifiedUid(request), await getParams()),
  }),
);

export const reorderHomePhotos = defineCallable(
  'reorderHomePhotos',
  { input: ReorderHomePhotosInput, output: PhotosOutput },
  async ({ input, request }) => ({
    photos: await homes.reorderPhotos(
      db(),
      verifiedUid(request),
      input.photoIds,
      await getParams(),
    ),
  }),
);

export const deleteHomePhoto = defineCallable(
  'deleteHomePhoto',
  { input: DeleteHomePhotoInput, output: PhotosOutput },
  async ({ input, request }) => ({
    photos: await homes.deletePhoto(db(), verifiedUid(request), input.photoId, await getParams()),
  }),
);

export const acceptDeclaration = defineCallable(
  'acceptDeclaration',
  { input: AcceptDeclarationInput, output: HomeOutput },
  async ({ input, request }) => ({
    home: await homes.acceptDeclaration(
      db(),
      verifiedUid(request),
      input.version,
      requestIp(request.rawRequest),
      await getParams(),
    ),
  }),
);

/** FR-13 — A, EV, PV, ACT. */
export const publishHome = defineCallable(
  'publishHome',
  { input: EmptyInput, output: PublishHomeOutput },
  async ({ request }) => homes.publishHome(db(), verifiedUid(request), await getParams()),
);

export const pauseHome = defineCallable(
  'pauseHome',
  { input: EmptyInput, output: HomeOutput },
  async ({ request }) => ({
    home: await homes.setPaused(db(), verifiedUid(request), true, await getParams()),
  }),
);

export const unpauseHome = defineCallable(
  'unpauseHome',
  { input: EmptyInput, output: HomeOutput },
  async ({ request }) => ({
    home: await homes.setPaused(db(), verifiedUid(request), false, await getParams()),
  }),
);

/** FR-14–16 — A, EV. */
export const updateTravelPrefs = defineCallable(
  'updateTravelPrefs',
  { input: TravelPrefsInput, output: HomeOutput },
  async ({ input, request, now }) => ({
    home: await homes.updateTravelPrefs(db(), verifiedUid(request), input, await getParams(), now),
  }),
);
