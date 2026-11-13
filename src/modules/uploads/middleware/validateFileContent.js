
const fs = require('fs/promises');
const path = require('path');
const JSZip = require('jszip');

const OLE_SIGNATURE = Buffer.from([
  0xd0, 0xcf, 0x11, 0xe0,
  0xa1, 0xb1, 0x1a, 0xe1,
]);

const signatures = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx':
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.doc': 'application/msword',
  '.docx':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

async function validateOfficeDocument(file, extension) {
  const buffer = await fs.readFile(file.path);

  // Legacy PowerPoint and Word documents use OLE Compound File format.
  if (extension === '.ppt' || extension === '.doc') {
    return (
      buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(OLE_SIGNATURE)
    );
  }

  // PPTX and DOCX are ZIP-based Office Open XML packages.
  let zip;

  try {
    zip = await JSZip.loadAsync(buffer, {
      checkCRC32: true,
    });
  } catch {
    return false;
  }

  const contentTypesFile = zip.file('[Content_Types].xml');

  if (!contentTypesFile) return false;

  const contentTypes = await contentTypesFile.async('string');

  if (extension === '.pptx') {
    const presentationFile = zip.file('ppt/presentation.xml');

    if (!presentationFile) return false;

    return contentTypes.includes(
      'application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml'
    );
  }

  if (extension === '.docx') {
    const documentFile = zip.file('word/document.xml');

    if (!documentFile) return false;

    return contentTypes.includes(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml'
    );
  }

  return false;
}

async function validateFileContent(file) {
  if (!file?.path || !file.originalname) return false;

  const extension = path.extname(file.originalname).toLowerCase();
  const expectedMimeType = signatures[extension];

  if (!expectedMimeType || file.mimetype !== expectedMimeType) {
    return false;
  }

  if (['.ppt', '.pptx', '.doc', '.docx'].includes(extension)) {
    return validateOfficeDocument(file, extension);
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
            Buffer.from([
              0x89, 0x50, 0x4e, 0x47,
              0x0d, 0x0a, 0x1a, 0x0a,
            ])
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
  } catch {
    return false;
  } finally {
    if (handle) await handle.close();
  }
}

module.exports = { validateFileContent };
