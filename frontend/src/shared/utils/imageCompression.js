/**
 * Client-side Canvas image pre-compression utility.
 * Resizes images to <= maxDimension on the longest edge and re-encodes as WebP
 * (with JPEG fallback) before uploading to reduce mobile bandwidth and upload latency.
 * Server-side Pillow validation & compression still enforces final limits and strips EXIF.
 */
export async function compressImageFile(
  file,
  { maxDimension = 1280, quality = 0.78 } = {}
) {
  if (!(file instanceof File) || !file.type?.startsWith('image/')) {
    return file;
  }

  let bitmap = null;
  let objectUrl = '';
  try {
    let width = 0;
    let height = 0;
    let drawSource = null;

    if (typeof createImageBitmap === 'function') {
      bitmap = await createImageBitmap(file);
      width = bitmap.width;
      height = bitmap.height;
      drawSource = bitmap;
    } else {
      objectUrl = URL.createObjectURL(file);
      const img = await new Promise((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = objectUrl;
      });
      width = img.naturalWidth || img.width;
      height = img.naturalHeight || img.height;
      drawSource = img;
    }

    if (!width || !height) return file;

    const longest = Math.max(width, height);
    const scale = longest > maxDimension ? maxDimension / longest : 1;
    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    // Fill white background so transparent PNGs flatten cleanly
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.drawImage(drawSource, 0, 0, targetW, targetH);

    const blob = await new Promise((resolve) => {
      canvas.toBlob(
        (b) => {
          if (b) {
            resolve(b);
          } else {
            canvas.toBlob((jb) => resolve(jb), 'image/jpeg', quality);
          }
        },
        'image/webp',
        quality
      );
    });

    if (!blob) return file;

    const ext = blob.type === 'image/webp' ? '.webp' : '.jpg';
    const stem = file.name.replace(/\.[^/.]+$/, '') || 'photo';
    return new File([blob], `${stem}${ext}`, {
      type: blob.type,
      lastModified: Date.now(),
    });
  } catch {
    return file;
  } finally {
    if (bitmap && typeof bitmap.close === 'function') bitmap.close();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

export function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
