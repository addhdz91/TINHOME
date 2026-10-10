import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMutation } from '@tanstack/react-query';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { HomePhoto } from '@tinhome/shared/schemas';
import { useMe } from '@/app/auth/auth-context';
import { Button } from '@/components/ui/button';
import { toUserMessage } from '@/lib/app-error';
import { deleteHomePhoto, reorderHomePhotos } from '@/lib/callables';
import { cn } from '@/lib/utils';
import { compressImage, uploadProblem, uploadRawPhoto } from '../lib/upload';

interface Pending {
  id: string;
  name: string;
  progress: number;
  state: 'uploading' | 'processing' | 'failed';
}

function SortablePhoto({
  photo,
  index,
  total,
  title,
  onDelete,
}: {
  photo: HomePhoto;
  index: number;
  total: number;
  title: string;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: photo.id,
  });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'relative aspect-square overflow-hidden rounded-md border border-border bg-surface-muted',
        isDragging && 'z-10 shadow-sheet',
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={t('home.photos.alt', { n: index + 1, total, title })}
        className="block size-full cursor-grab touch-none active:cursor-grabbing"
      >
        <img
          src={photo.thumbUrl}
          alt=""
          width={photo.width}
          height={photo.height}
          loading="lazy"
          className="size-full object-cover"
        />
      </button>
      {index === 0 ? (
        <span className="pointer-events-none absolute top-1 left-1 rounded-sm bg-primary px-2 py-0.5 text-caption font-semibold text-primary-foreground">
          {t('home.photos.cover')}
        </span>
      ) : null}
      <button
        type="button"
        onClick={onDelete}
        aria-label={t('home.photos.delete', { n: index + 1 })}
        className="absolute top-1 right-1 inline-flex size-11 items-center justify-center rounded-full bg-overlay text-on-media"
      >
        <Trash2 aria-hidden="true" className="size-5" />
      </button>
    </li>
  );
}

interface PhotoUploaderProps {
  photos: HomePhoto[];
  title: string;
  min: number;
  max: number;
  onPhotosChange: (photos: HomePhoto[]) => void;
}

/** C-11 — drop zone + «Añadir fotos», per-photo progress, sortable thumbnails (dnd-kit), cover badge. */
export function PhotoUploader({ photos, title, min, max, onPhotosChange }: PhotoUploaderProps) {
  const { t } = useTranslation();
  const me = useMe();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const reorder = useMutation({ mutationFn: reorderHomePhotos });
  const remove = useMutation({ mutationFn: deleteHomePhoto });

  // Uploads that finished processing disappear from the pending list.
  const processedIds = new Set(photos.map((p) => p.id));
  const visiblePending = pending.filter((p) => !processedIds.has(p.id));
  const slots = max - photos.length - visiblePending.filter((p) => p.state !== 'failed').length;

  const addFiles = (files: FileList | File[]) => {
    const list = Array.from(files);
    if (slots <= 0) {
      toast.error(t('home.photos.full'));
      return;
    }
    for (const file of list.slice(0, slots)) {
      const problem = uploadProblem(file);
      if (problem) {
        toast.error(t(`home.photos.${problem}`));
        continue;
      }
      const id = crypto.randomUUID();
      setPending((current) => [
        ...current,
        { id, name: file.name, progress: 0, state: 'uploading' },
      ]);
      const update = (patch: Partial<Pending>) =>
        setPending((current) => current.map((p) => (p.id === id ? { ...p, ...patch } : p)));
      void compressImage(file)
        .then((blob) => uploadRawPhoto(me.uid, id, blob, (progress) => update({ progress })))
        .then(() => update({ state: 'processing', progress: 100 }))
        .catch(() => update({ state: 'failed' }));
    }
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = photos.findIndex((p) => p.id === active.id);
    const to = photos.findIndex((p) => p.id === over.id);
    const next = arrayMove(photos, from, to).map((p, order) => ({ ...p, order }));
    const previous = photos;
    onPhotosChange(next);
    reorder.mutate(
      { photoIds: next.map((p) => p.id) },
      {
        onError: (error) => {
          onPhotosChange(previous);
          toast.error(toUserMessage(t, error));
        },
      },
    );
  };

  const onDelete = (photoId: string) => {
    const previous = photos;
    onPhotosChange(photos.filter((p) => p.id !== photoId).map((p, order) => ({ ...p, order })));
    remove.mutate(
      { photoId },
      {
        onSuccess: () => toast.success(t('home.photos.deleted')),
        onError: (error) => {
          onPhotosChange(previous);
          toast.error(toUserMessage(t, error));
        },
      },
    );
  };

  return (
    <section aria-labelledby={`${inputId}-title`} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id={`${inputId}-title`} className="text-h2">
          {t('home.photos.title')}
        </h2>
        <p className="text-muted">{t('home.photos.guide')}</p>
      </div>
      {/* Drag-and-drop is a pointer shortcut; the file button inside is the accessible path. */}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions -- drop target only */}
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          addFiles(event.dataTransfer.files);
        }}
        className={cn(
          'flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-6 text-center',
          dragOver && 'border-primary bg-brand-soft',
        )}
      >
        <ImagePlus aria-hidden="true" className="size-8 text-brand-text" />
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          multiple
          className="sr-only"
          onChange={(event) => {
            if (event.target.files) addFiles(event.target.files);
            event.target.value = '';
          }}
        />
        <Button type="button" onClick={() => inputRef.current?.click()} disabled={slots <= 0}>
          {t('home.photos.add')}
        </Button>
        <span className="text-sm text-muted">{t('home.photos.drop')}</span>
      </div>
      <p aria-live="polite" className="text-sm font-semibold">
        {t('home.photos.count', { count: photos.length, max })}
        {photos.length < min ? ` · ${t('home.photos.min', { count: min - photos.length })}` : ''}
      </p>
      {photos.length > 1 ? (
        <p className="text-sm text-muted">{t('home.photos.reorderHint')}</p>
      ) : null}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {photos.map((photo, index) => (
              <SortablePhoto
                key={photo.id}
                photo={photo}
                index={index}
                total={photos.length}
                title={title}
                onDelete={() => onDelete(photo.id)}
              />
            ))}
            {visiblePending.map((item) => (
              <li
                key={item.id}
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-md border border-border bg-surface-muted p-2 text-center text-caption"
              >
                {item.state === 'failed' ? (
                  <span className="text-danger">{t('home.photos.failed')}</span>
                ) : (
                  <>
                    <Loader2 aria-hidden="true" className="size-5 animate-spin text-primary" />
                    <span>
                      {item.state === 'uploading'
                        ? t('home.photos.uploading', { progress: item.progress })
                        : t('home.photos.processing')}
                    </span>
                  </>
                )}
              </li>
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </section>
  );
}
