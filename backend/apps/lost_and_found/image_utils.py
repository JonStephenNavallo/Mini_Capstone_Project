"""Server-side image validation, EXIF stripping, resizing, and WebP compression."""
import io
import os
import uuid
from django.core.files.base import ContentFile
from PIL import Image, ImageOps, UnidentifiedImageError
from rest_framework.exceptions import ValidationError

MAX_ITEM_PHOTOS = 4
MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB raw upload cap
DEFAULT_MAX_DIMENSION = 1280
DEFAULT_WEBP_QUALITY = 80


def compress_uploaded_image(
    uploaded_file,
    *,
    max_dimension: int = DEFAULT_MAX_DIMENSION,
    quality: int = DEFAULT_WEBP_QUALITY,
    field_name: str = 'image',
):
    """
    Validate an uploaded image file, auto-orient via EXIF, strip all EXIF/GPS
    metadata, resize so the longest side is <= max_dimension, and re-encode as
    optimized WebP.
    """
    if not uploaded_file:
        return None

    file_size = getattr(uploaded_file, 'size', None)
    if file_size is not None and file_size > MAX_IMAGE_UPLOAD_BYTES:
        raise ValidationError(
            {field_name: 'Image file size must be 10 MB or smaller.'}
        )

    try:
        if hasattr(uploaded_file, 'seek'):
            uploaded_file.seek(0)
        with Image.open(uploaded_file) as raw_img:
            img = ImageOps.exif_transpose(raw_img)
            # Composite transparency onto a clean white background before WebP/RGB encode
            if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
                rgba = img.convert('RGBA')
                bg = Image.new('RGB', rgba.size, (255, 255, 255))
                bg.paste(rgba, mask=rgba.split()[3])
                img = bg
            elif img.mode != 'RGB':
                img = img.convert('RGB')

            img.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)

            buffer = io.BytesIO()
            img.save(buffer, format='WEBP', quality=quality, method=6)
            compressed_bytes = buffer.getvalue()
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise ValidationError(
            {field_name: 'Uploaded file is not a valid image.'}
        ) from exc

    orig_name = getattr(uploaded_file, 'name', '') or f'photo_{uuid.uuid4().hex[:8]}'
    stem = os.path.splitext(os.path.basename(orig_name))[0][:60] or 'photo'
    safe_stem = ''.join(ch if ch.isalnum() or ch in ('-', '_') else '_' for ch in stem)
    filename = f'{safe_stem}_{uuid.uuid4().hex[:6]}.webp'
    return ContentFile(compressed_bytes, name=filename)
