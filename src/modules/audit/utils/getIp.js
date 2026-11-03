/**
 * Extract the client IP address from an Express request.
 * Handles proxies (nginx, Cloudflare) via x-forwarded-for header.
 */
exports.getIp = (req) => {
  if (!req) return null;

  // Check for proxy headers first
  const forwarded = req.headers ? req.headers['x-forwarded-for'] : null;
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs — take the first
    return String(forwarded).split(',')[0].trim();
  }

  // Fallback to socket address
  return req.socket?.remoteAddress || req.ip || null;
};