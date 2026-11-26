const mongoose = require('mongoose');

// Standalone MongoDB (typical local dev) cannot run transactions.
const isTxnUnsupported = (err) =>
/transaction numbers are only allowed|replica set member or mongos|transactions are not supported|does not support retryable writes|retryWrites=false/i.test(
    String(err?.message || '')
  );

let warned = false;

/**
 * Runs fn(session) inside a MongoDB transaction.
 * If the server does not support transactions (standalone MongoDB), it falls back
 * to running fn(null) without a session so the API still works in local dev.
 * In production use a replica set so the writes are atomic.
 */
module.exports = async (fn) => {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } catch (err) {
    if (!isTxnUnsupported(err)) throw err;
    if (!warned) {
      console.warn(
        '[distributions] MongoDB transactions are not supported on this server (standalone). ' +
          'Running without a transaction. Use a replica set in production.'
      );
      warned = true;
    }
    return fn(null);
  } finally {
    await session.endSession();
  }
};

module.exports.isTxnUnsupported = isTxnUnsupported;