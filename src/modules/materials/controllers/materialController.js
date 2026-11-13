const fs = require('fs');
const materialService = require('../services/materialService');

// --------------------------------------------------
// CREATE MATERIAL
// --------------------------------------------------

exports.createMaterial = async (req, res, next) => {
  try {
    const material = await materialService.createMaterial(
      req.body,
      req.user
    );

    res.status(201).json({
      success: true,
      message: 'Study material created successfully.',
      data: material,
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------
// GET ALL MATERIALS
// --------------------------------------------------

exports.getMaterials = async (req, res, next) => {
  try {
    const materials = await materialService.getMaterials(
      req.query,
      req.user
    );

    res.status(200).json({
      success: true,
      count: materials.length,
      data: materials,
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------
// GET MATERIAL BY ID
// --------------------------------------------------

exports.getMaterialById = async (req, res, next) => {
  try {
    const material = await materialService.getMaterialById(
      req.params.id,
      req.user
    );

    res.status(200).json({
      success: true,
      data: material,
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------
// UPDATE MATERIAL
// --------------------------------------------------

exports.updateMaterial = async (req, res, next) => {
  try {
    const material = await materialService.updateMaterial(
      req.params.id,
      req.body,
      req.user
    );

    res.status(200).json({
      success: true,
      message: 'Study material updated successfully.',
      data: material,
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------
// UPDATE MATERIAL STATUS
// --------------------------------------------------

// --------------------------------------------------
// DELETE MATERIAL
// --------------------------------------------------

exports.deleteMaterial = async (req, res, next) => {
  try {
    const material = await materialService.deleteMaterial(
      req.params.id,
      req.user
    );

    res.status(200).json({
      success: true,
      message: 'Study material deleted successfully.',
      data: {
        _id: material._id,
        title: material.title
      }
    });
  } catch (error) {
    next(error);
  }
};


// --------------------------------------------------
// GET STUDENT WATERMARK IDENTITY
// --------------------------------------------------

exports.getWatermarkIdentity = async (req, res, next) => {
  try {
    const identity = await materialService.getWatermarkIdentity(req.user);

    res.status(200).json({
      success: true,
      data: identity,
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------
// DOWNLOAD / VIEW PDF MATERIAL
// --------------------------------------------------
// --------------------------------------------------
// VIEW DOCUMENT
// --------------------------------------------------


exports.viewDocument = async (req, res, next) => {
  let generated;
  let documentStream;

  try {
    const { upload, filePath } =
      await materialService.getDocumentForDownload(
        req.params.id,
        req.user
      );

    // PDF files are previewed directly.
    // Office files are converted to PDF by the service.
    generated = await materialService.createDocumentPreviewFile(
      upload,
      filePath,
      req.user
    );

    const stat = fs.statSync(generated.filePath);

    const isOfficeDocument =
      upload.mimeType !== 'application/pdf';

    const previewName = isOfficeDocument
      ? `${require('path').parse(upload.originalName).name}.pdf`
      : upload.originalName;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', stat.size);
    res.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(previewName)}`
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');

    documentStream = fs.createReadStream(generated.filePath);

    const cleanup = () =>
      generated?.cleanup().catch(() => {});

    documentStream.on('close', cleanup);

    documentStream.on('error', (error) => {
      cleanup();

      if (!res.headersSent) {
        next(error);
      } else {
        res.destroy(error);
      }
    });

    res.on('close', () => {
      if (documentStream && !documentStream.destroyed) {
        documentStream.destroy();
      }
    });

    documentStream.pipe(res);
  } catch (error) {
    if (generated) {
      await generated.cleanup().catch(() => {});
    }

    next(error);
  }
};



// --------------------------------------------------
// DOWNLOAD DOCUMENT
// --------------------------------------------------

exports.downloadDocument = async (req, res, next) => {
  let generated;
  let documentStream;

  try {
    const { upload, filePath } =
      await materialService.getDocumentForDownload(
        req.params.id,
        req.user
      );

    generated = await materialService.createStudentWatermarkedFile(
      upload,
      filePath,
      req.user
    );

    const stat = fs.statSync(generated.filePath);

    res.setHeader('Content-Type', upload.mimeType);
    res.setHeader('Content-Length', stat.size);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(upload.originalName)}`
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');

    documentStream = fs.createReadStream(generated.filePath);

    const cleanup = () => generated?.cleanup().catch(() => {});

    documentStream.on('close', cleanup);
    documentStream.on('error', (error) => {
      cleanup();

      if (!res.headersSent) {
        next(error);
      } else {
        res.destroy(error);
      }
    });

    res.on('close', () => documentStream.destroy());

    documentStream.pipe(res);
  } catch (error) {
    if (generated) {
      await generated.cleanup().catch(() => {});
    }

    next(error);
  }
};


// --------------------------------------------------
// STREAM VIDEO WITH HTTP RANGE SUPPORT
// --------------------------------------------------

// --------------------------------------------------
// STREAM WATERMARKED VIDEO WITH HTTP RANGE SUPPORT
// --------------------------------------------------

exports.streamVideo = async (req, res, next) => {
  let generated;
  let videoStream;

  try {
    const { upload, filePath } =
      await materialService.getVideoForStreaming(
        req.params.id,
        req.user
      );

    generated = await materialService.createStudentWatermarkedFile(
      upload,
      filePath,
      req.user
    );

    const stat = fs.statSync(generated.filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    const cleanup = () => generated?.cleanup().catch(() => {});

    res.setHeader('Content-Type', upload.mimeType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');

    // Full video response
    if (!range) {
      res.setHeader('Content-Length', fileSize);

      videoStream = fs.createReadStream(generated.filePath);

      videoStream.on('close', cleanup);

      videoStream.on('error', (error) => {
        cleanup();

        if (!res.headersSent) {
          next(error);
        } else {
          res.destroy(error);
        }
      });

      res.on('close', () => videoStream.destroy());

      return videoStream.pipe(res);
    }

    // Parse Range header
    const parts = range.replace(/bytes=/, '').split('-');

    if (
      parts.length !== 2 ||
      !/^\d*$/.test(parts[0]) ||
      !/^\d*$/.test(parts[1]) ||
      (!parts[0] && !parts[1])
    ) {
      res.setHeader('Content-Range', `bytes */${fileSize}`);
      await cleanup();
      return res.status(416).end();
    }

    let start;
    let end;

    // Suffix range
    if (!parts[0]) {
      const suffixLength = Number(parts[1]);

      if (
        !Number.isSafeInteger(suffixLength) ||
        suffixLength <= 0
      ) {
        res.setHeader('Content-Range', `bytes */${fileSize}`);
        await cleanup();
        return res.status(416).end();
      }

      start = Math.max(fileSize - suffixLength, 0);
      end = fileSize - 1;
    } else {
      start = Number(parts[0]);
      end = parts[1] ? Number(parts[1]) : fileSize - 1;
    }

    if (
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(end) ||
      start < 0 ||
      start >= fileSize ||
      end < start
    ) {
      res.setHeader('Content-Range', `bytes */${fileSize}`);
      await cleanup();
      return res.status(416).end();
    }

    end = Math.min(end, fileSize - 1);

    const chunkSize = end - start + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Content-Length': chunkSize,
      'Content-Type': upload.mimeType,
      'Accept-Ranges': 'bytes',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    });

    videoStream = fs.createReadStream(generated.filePath, {
      start,
      end,
    });

    videoStream.on('close', cleanup);

    videoStream.on('error', (error) => {
      cleanup();

      if (!res.headersSent) {
        next(error);
      } else {
        res.destroy(error);
      }
    });

    res.on('close', () => videoStream.destroy());

    videoStream.pipe(res);
  } catch (error) {
    if (generated) {
      await generated.cleanup().catch(() => {});
    }

    next(error);
  }
};