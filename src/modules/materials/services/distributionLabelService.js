const MaterialDistribution = require('../models/MaterialDistribution');
const U = require('../utils/distributionUtils');

const { createError } = U;

/**
 * Returns the data needed to print a POST / COURIER label (JSON only).
 * Rendering / printing is done by the frontend.
 *
 * Incomplete address -> 422 INCOMPLETE_ADDRESS (with `missing` list)
 * unless force=true, in which case data is returned with incomplete=true.
 */
exports.getLabelData = async (id, { force = false } = {}) => {
  if (!U.OBJECT_ID_RE.test(String(id || ''))) throw createError('Invalid distribution id.', 400);

  const doc = await MaterialDistribution.findById(id).lean();
  if (!doc) throw createError('Distribution record not found.', 404);
  if (doc.method === 'HAND') {
    throw createError('Labels are only available for POST and COURIER distributions.', 400);
  }

  const missing = [
    ...U.missingAddressFields(doc.recipient_address).map((f) => `recipient.${f}`),
    ...U.missingAddressFields(doc.sender_address).map((f) => `sender.${f}`),
  ];

  if (missing.length && !force) {
    throw createError(
      `Cannot print label: address is incomplete (${missing.join(', ')}). Fix the address or print anyway.`,
      422,
      { code: 'INCOMPLETE_ADDRESS', missing }
    );
  }

  const items = (doc.items || []).map((it) => ({
    ...it,
    item_type_label: U.ITEM_TYPE_LABELS[it.item_type] || it.item_type,
  }));

  return {
    incomplete: missing.length > 0,
    missing,
    label: {
      _id: doc._id,
      distribution_no: doc.distribution_no,
      method: doc.method,
      status: doc.status,
      sender: doc.sender_address,
      recipient: doc.recipient_address,
      shipment: doc.shipment,
      items,
      total_quantity: items.reduce((n, it) => n + (it.quantity || 0), 0),
      remarks: doc.remarks || '',
      recorded_by_name: doc.recorded_by_name,
      given_by_name: doc.given_by_name,
      created_at: doc.createdAt,
    },
  };
};