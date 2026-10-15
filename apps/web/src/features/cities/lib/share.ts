/**
 * Shares a link with the Web Share API, falling back to the clipboard.
 * Returns what happened so the caller can show the right toast.
 */
export async function shareLink(data: {
  title: string;
  text: string;
  url: string;
}): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (typeof navigator.share === 'function') {
      await navigator.share(data);
      return 'shared';
    }
    await navigator.clipboard.writeText(data.url);
    return 'copied';
  } catch (error) {
    // The user closing the share sheet is not an error.
    if (error instanceof DOMException && error.name === 'AbortError') return 'shared';
    return 'failed';
  }
}
