
const fs = require('fs/promises');

const signatures = {
  '.pdf': {
    mimeType: 'application/pdf',
  },
  '.jpg': {
    mimeType: 'image/jpeg',
  },
  '.jpeg': {
    mimeType: 'image/jpeg',
  },
  '.png': {
    mimeType: 'image/png',
  },
  '.webp': {
    mimeType: 'image/webp',
  },
};

async function validateFileContent(file) {
  if (!file) return false;

  const extension = require('path')
    .extname(file.originalname)
    .toLowerCase();

  const expected = signatures[extension];

  if (!expected || file.mimetype !== expected.mimeType) {
    return false;
  }

  let handle;

  try {
    handle = await fs.open(file.path, 'r');

    const buffer = Buffer.alloc(12);
    const { bytesRead } = await handle.read(buffer, 0, 12, 0);
    const header = buffer.subarray(0, bytesRead);

    switch (extension) {
      case '.pdf':
        return header.subarray(0, 5).toString() === '%PDF-';

      case '.jpg':
      case '.jpeg':
        return (
          header.length >= 3 &&
          header[0] === 0xff &&
          header[1] === 0xd8 &&
          header[2] === 0xff
        );

      case '.png':
        return (
          header.length >= 8 &&
          header.subarray(0, 8).equals(
            Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
          )
        );

      case '.webp':
        return (
          header.length >= 12 &&
          header.subarray(0, 4).toString() === 'RIFF' &&
          header.subarray(8, 12).toString() === 'WEBP'
        );

      default:
        return false;
    }
  } finally {
    if (handle) await handle.close();
  }
}

module.exports = { validateFileContent };
