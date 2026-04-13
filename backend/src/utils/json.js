function parseJson(value) {
  if (value == null || value === '') return null;
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) {
    try {
      return JSON.parse(value.toString('utf8'));
    } catch {
      return null;
    }
  }
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

module.exports = { parseJson };
