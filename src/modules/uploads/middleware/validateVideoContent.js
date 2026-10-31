
const fs = require('fs/promises');
const path = require('path');

const validateVideoContent = async (file) => {
  if (!file?.path) return false;

  const extension = path.extname(file.originalname).toLowerCase();

  try {
    const handle = await fs.open(file.path, 'r');

    try {
      const buffer = Buffer.alloc(12);
      const { bytesRead } = await handle.read(buffer, 0, 12, 0);

      if (extension === '.mp4' || extension === '.mov') {
        // MP4 and MOV files use the ISO Base Media File Format.
        return (
          bytesRead >= 8 &&
          buffer.toString('ascii', 4, 8) === 'ftyp'
        );
      }

      if (extension === '.webm') {
        // EBML signature used by WebM.
        return (
          bytesRead >= 4 &&
          buffer[0] === 0x1A &&
          buffer[1] === 0x45 &&
          buffer[2] === 0xDF &&
          buffer[3] === 0xA3
        );
      }

      return false;
    } finally {
      await handle.close();
    }
  } catch {
    return false;
  }
};

module.exports = { validateVideoContent };
