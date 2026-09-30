export const MAX_ASSET_FILE_SIZE_BYTES =
  10 * 1024 * 1024;

export const ASSET_UPLOAD_DIRECTORY =
  'uploads';

export const ALLOWED_ASSET_MIME_TYPES =
  new Set<string>([
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'application/pdf',
  ]);

export function getAssetFileExtension(
  mimeType: string,
) {
  switch (mimeType) {
    case 'image/png':
      return '.png';

    case 'image/jpeg':
      return '.jpg';

    case 'image/webp':
      return '.webp';

    case 'image/gif':
      return '.gif';

    case 'application/pdf':
      return '.pdf';

    default:
      return '';
  }
}

function startsWithBytes(
  buffer: Buffer,
  bytes: number[],
) {
  if (
    buffer.length <
    bytes.length
  ) {
    return false;
  }

  return bytes.every(
    (byte, index) =>
      buffer[index] === byte,
  );
}

export function hasValidAssetFileSignature(
  mimeType: string,
  buffer: Buffer,
) {
  switch (mimeType) {
    case 'image/png':
      return startsWithBytes(
        buffer,
        [
          0x89,
          0x50,
          0x4e,
          0x47,
          0x0d,
          0x0a,
          0x1a,
          0x0a,
        ],
      );

    case 'image/jpeg':
      return startsWithBytes(
        buffer,
        [
          0xff,
          0xd8,
          0xff,
        ],
      );

    case 'image/gif': {
      const signature =
        buffer
          .subarray(0, 6)
          .toString('ascii');

      return (
        signature ===
          'GIF87a' ||
        signature ===
          'GIF89a'
      );
    }

    case 'image/webp': {
      if (
        buffer.length < 12
      ) {
        return false;
      }

      const riff =
        buffer
          .subarray(0, 4)
          .toString('ascii');

      const webp =
        buffer
          .subarray(8, 12)
          .toString('ascii');

      return (
        riff === 'RIFF' &&
        webp === 'WEBP'
      );
    }

    case 'application/pdf':
      return startsWithBytes(
        buffer,
        [
          0x25, // %
          0x50, // P
          0x44, // D
          0x46, // F
          0x2d, // -
        ],
      );

    default:
      return false;
  }
}