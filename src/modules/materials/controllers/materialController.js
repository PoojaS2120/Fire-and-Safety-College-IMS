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

exports.updateMaterialStatus = async (req, res, next) => {
  try {
    const material = await materialService.updateMaterialStatus(
      req.params.id,
      req.body.status,
      req.user
    );

    res.status(200).json({
      success: true,
      message: 'Material status updated successfully.',
      data: material,
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

exports.downloadPdf = async (req, res, next) => {
  try {
    const { upload, filePath } =
      await materialService.getPdfForDownload(
        req.params.id,
        req.user
      );

    const stat = fs.statSync(filePath);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', stat.size);

    res.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(upload.originalName)}`
    );

    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');

    const pdfStream = fs.createReadStream(filePath);

    pdfStream.on('error', (error) => {
      if (!res.headersSent) {
        next(error);
      } else {
        res.destroy(error);
      }
    });

    pdfStream.pipe(res);
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------
// STREAM VIDEO WITH HTTP RANGE SUPPORT
// --------------------------------------------------

exports.streamVideo = async (req, res, next) => {
  let videoStream;

  try {
    const { upload, filePath } =
      await materialService.getVideoForStreaming(
        req.params.id,
        req.user
      );

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    res.setHeader('Content-Type', upload.mimeType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');

    // Full video response when Range header is not provided.
    if (!range) {
      res.setHeader('Content-Length', fileSize);

      videoStream = fs.createReadStream(filePath);

      videoStream.on('error', (error) => {
        if (!res.headersSent) {
          next(error);
        } else {
          res.destroy(error);
        }
      });

      return videoStream.pipe(res);
    }

    // Parse Range header.
    const parts = range.replace(/bytes=/, '').split('-');

    if (
      parts.length !== 2 ||
      !/^\d*$/.test(parts[0]) ||
      !/^\d*$/.test(parts[1]) ||
      (!parts[0] && !parts[1])
    ) {
      res.setHeader('Content-Range', `bytes */${fileSize}`);
      return res.status(416).end();
    }

    let start;
    let end;

    // Handle suffix range, e.g. bytes=-500.
    if (!parts[0]) {
      const suffixLength = Number(parts[1]);

      if (
        !Number.isSafeInteger(suffixLength) ||
        suffixLength <= 0
      ) {
        res.setHeader('Content-Range', `bytes */${fileSize}`);
        return res.status(416).end();
      }

      start = Math.max(fileSize - suffixLength, 0);
      end = fileSize - 1;
    } else {
      start = Number(parts[0]);
      end = parts[1] ? Number(parts[1]) : fileSize - 1;
    }

    // Validate requested byte range.
    if (
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(end) ||
      start < 0 ||
      start >= fileSize ||
      end < start
    ) {
      res.setHeader('Content-Range', `bytes */${fileSize}`);
      return res.status(416).end();
    }

    end = Math.min(end, fileSize - 1);

    const chunkSize = end - start + 1;

    // Partial content response.
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Content-Length': chunkSize,
      'Content-Type': upload.mimeType,
      'Accept-Ranges': 'bytes',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    });

    videoStream = fs.createReadStream(filePath, {
      start,
      end,
    });

    videoStream.on('error', (error) => {
      if (!res.headersSent) {
        next(error);
      } else {
        res.destroy(error);
      }
    });

    videoStream.pipe(res);
  } catch (error) {
    next(error);
  }
};