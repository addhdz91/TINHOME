import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { REGION } from '@tinhome/shared/constants';
import { clock } from '../../core/clock.js';
import { db } from '../../core/firebase.js';
import { getParams } from '../../core/params.js';
import { bucketName } from '../../core/storage.js';
import { parseRawPhotoPath, processHomePhoto } from './photos.js';

/** 03 §5.4 — every upload to `homes/{uid}/raw/{photoId}` is processed and then deleted. */
export const onHomePhotoUploaded = onObjectFinalized(
  { region: REGION, bucket: bucketName(), memory: '1GiB', timeoutSeconds: 120 },
  async (event) => {
    const path = event.data.name;
    if (!parseRawPhotoPath(path)) return;
    await processHomePhoto(db(), path, await getParams(), clock.now());
  },
);
