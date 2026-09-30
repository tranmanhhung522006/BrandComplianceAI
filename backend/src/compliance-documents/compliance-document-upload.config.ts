import {
  extname,
} from 'node:path';

export const MAX_COMPLIANCE_DOCUMENT_SIZE_BYTES =
  20 * 1024 * 1024;

const allowedExtensionsByMimeType:
  Record<string, Set<string>> = {
    'application/pdf':
      new Set([
        '.pdf',
      ]),

    'text/plain':
      new Set([
        '.txt',
        '.md',
      ]),

    'text/markdown':
      new Set([
        '.md',
      ]),

    'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      new Set([
        '.docx',
      ]),
  };

export function getComplianceDocumentExtension(
  mimeType: string,
  originalName: string,
) {
  const extension =
    extname(
      originalName,
    ).toLowerCase();

  const allowedExtensions =
    allowedExtensionsByMimeType[
      mimeType
    ];

  if (
    !allowedExtensions ||
    !allowedExtensions.has(
      extension,
    )
  ) {
    return '';
  }

  return extension;
}

export function isAllowedComplianceDocument(
  mimeType: string,
  originalName: string,
) {
  return Boolean(
    getComplianceDocumentExtension(
      mimeType,
      originalName,
    ),
  );
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

export function hasValidComplianceDocumentSignature(
  mimeType: string,
  buffer: Buffer,
) {
  if (
    mimeType ===
    'application/pdf'
  ) {
    return (
      buffer
        .subarray(
          0,
          5,
        )
        .toString(
          'ascii',
        ) === '%PDF-'
    );
  }

  if (
    mimeType ===
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return startsWithBytes(
      buffer,
      [
        0x50,
        0x4b,
        0x03,
        0x04,
      ],
    );
  }

  if (
    mimeType ===
      'text/plain' ||
    mimeType ===
      'text/markdown'
  ) {
    const sample =
      buffer.subarray(
        0,
        Math.min(
          buffer.length,
          4096,
        ),
      );

    return !sample.includes(
      0,
    );
  }

  return false;
}