import { FieldValue, type DocumentData, type Firestore } from 'firebase-admin/firestore';
import sharp, { type Metadata, type Sharp } from 'sharp';
import {
  dhashBands,
  dhashFromPixels,
  hammingDistance,
  photoChangeRatio,
} from '@tinhome/shared/domain';
import type { Params } from '@tinhome/shared/types';
import { logger, pseudonymize } from '../../core/logger.js';
import { bucket, downloadUrl, newDownloadToken } from '../../core/storage.js';
import { holdHome } from './holds.js';
import { recomputeHome } from './visibility.js';

/** 03 §5.4 — output sizes (longest side, px). */
export const PHOTO_SIZES = { thumb: 400, card: 1080, full: 1600 } as const;

const RAW_PATH = /^homes\/([^/]+)\/raw\/([^/]+)$/;

export function parseRawPhotoPath(path: string): { uid: string; photoId: string } | null {
  const match = RAW_PATH.exec(path);
  return match?.[1] && match[2] ? { uid: match[1], photoId: match[2] } : null;
}

/** dHash of an image buffer (9×8 greyscale, ADR-022). */
export async function computeDhash(input: Buffer): Promise<string> {
  const pixels = await sharp(input)
    .rotate()
    .greyscale()
    .resize(9, 8, { fit: 'fill' })
    .raw()
    .toBuffer();
  return dhashFromPixels(pixels);
}

export interface ProcessResult {
  status: 'PROCESSED' | 'SKIPPED_NO_HOME' | 'SKIPPED_FULL' | 'SKIPPED_INVALID';
  duplicateOf?: { homeId: string; photoId: string };
}

/**
 * FR-11 / FR-64 / FR-65 — processes `homes/{uid}/raw/{photoId}`: applies the EXIF orientation
 * and strips every metadata block (sharp drops EXIF/GPS unless asked to keep it), writes three
 * WebP sizes, computes the dHash, deletes the original and appends the photo to the home.
 * A near-duplicate of another home's photo, or too many replacements on a published home,
 * puts the home on preventive hold.
 */
export async function processHomePhoto(
  db: Firestore,
  path: string,
  params: Params,
  now: Date,
): Promise<ProcessResult> {
  const parsed = parseRawPhotoPath(path);
  if (!parsed) return { status: 'SKIPPED_INVALID' };
  const { uid, photoId } = parsed;
  const rawFile = bucket().file(path);
  const homeRef = db.doc(`homes/${uid}`);

  const home = await homeRef.get();
  const photos = (home.get('photos') as DocumentData[] | undefined) ?? [];
  if (!home.exists) {
    await rawFile.delete({ ignoreNotFound: true });
    return { status: 'SKIPPED_NO_HOME' };
  }
  if (photos.length >= params.photosMax) {
    await rawFile.delete({ ignoreNotFound: true });
    return { status: 'SKIPPED_FULL' };
  }

  const [original] = await rawFile.download();
  let base: Sharp;
  let meta: Metadata;
  try {
    base = sharp(original, { failOn: 'error' }).rotate();
    meta = await sharp(original).metadata();
  } catch {
    await rawFile.delete({ ignoreNotFound: true });
    return { status: 'SKIPPED_INVALID' };
  }
  const urls: Record<keyof typeof PHOTO_SIZES, string> = { thumb: '', card: '', full: '' };
  let width = 0;
  let height = 0;
  for (const [size, max] of Object.entries(PHOTO_SIZES) as [keyof typeof PHOTO_SIZES, number][]) {
    const { data, info } = await base
      .clone()
      .resize({ width: max, height: max, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    const target = `homes/${uid}/photos/${photoId}_${size}.webp`;
    const token = newDownloadToken();
    await bucket()
      .file(target)
      .save(data, {
        contentType: 'image/webp',
        metadata: {
          cacheControl: 'public, max-age=31536000, immutable',
          metadata: { firebaseStorageDownloadTokens: token },
        },
      });
    urls[size] = downloadUrl(target, token);
    if (size === 'card') {
      width = info.width;
      height = info.height;
    }
  }
  const dhash = await computeDhash(original);
  await rawFile.delete({ ignoreNotFound: true });

  // FR-64 — candidates from the 8 bands, then exact Hamming check against other homes.
  const bandRefs = dhashBands(dhash).map((band) => db.doc(`photoHashIndex/${band}`));
  const bandSnaps = await db.getAll(...bandRefs);
  const duplicate = bandSnaps
    .flatMap(
      (snap) =>
        (snap.get('entries') as { homeId: string; photoId: string; dhash: string }[] | undefined) ??
        [],
    )
    .find(
      (entry) =>
        entry.homeId !== uid &&
        hammingDistance(entry.dhash, dhash) <= params.photoDuplicateMaxHamming,
    );

  const entry = { homeId: uid, photoId, dhash };
  const wasPublished = home.get('status') === 'PUBLISHED';
  const changeLog = (
    (home.get('photoChangeLog') as
      { at: { toDate: () => Date }; replaced: number }[] | undefined) ?? []
  )
    .map((item) => ({ at: item.at.toDate(), replaced: item.replaced }))
    .filter((item) => now.getTime() - item.at.getTime() <= 30 * 86_400_000);
  if (wasPublished) changeLog.push({ at: now, replaced: 1 });

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(homeRef);
    const current = (snap.get('photos') as DocumentData[] | undefined) ?? [];
    tx.update(homeRef, {
      photos: [
        ...current,
        {
          id: photoId,
          order: current.length,
          ...{ thumbUrl: urls.thumb, cardUrl: urls.card, fullUrl: urls.full },
          width,
          height,
          dhash,
        },
      ],
      photoChangeLog: changeLog,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  await Promise.all(
    bandRefs.map((ref) => ref.set({ entries: FieldValue.arrayUnion(entry) }, { merge: true })),
  );

  logger.info('home photo processed', {
    uid: pseudonymize(uid),
    photoId,
    originalHadExif: meta.exif !== undefined,
    duplicate: duplicate !== undefined,
  });

  if (duplicate) {
    await holdHome(db, uid, 'PHOTO_DUPLICATE', params, now, {
      photoId,
      matchHomeId: duplicate.homeId,
      matchPhotoId: duplicate.photoId,
    });
    return {
      status: 'PROCESSED',
      duplicateOf: { homeId: duplicate.homeId, photoId: duplicate.photoId },
    };
  }
  if (
    wasPublished &&
    photoChangeRatio(changeLog, photos.length + 1, now) >= params.photoChangeReviewRatio
  ) {
    await holdHome(db, uid, 'PHOTO_CHANGES', params, now);
  } else {
    await recomputeHome(db, uid, params);
  }
  return { status: 'PROCESSED' };
}
