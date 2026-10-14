import { createHash } from 'node:crypto';

function bytes(value) {
  if (!(value instanceof Uint8Array)) throw new TypeError('Actual Uint8Array bytes required');
  return value;
}

export function sha256Bytes(value) {
  return createHash('sha256').update(bytes(value)).digest('hex');
}

export function utf8Bytes(value) {
  if (typeof value !== 'string') throw new TypeError('String required');
  return new TextEncoder().encode(value).byteLength;
}

// This oracle defines its own JSON convention. It is not the frozen v3 digest contract.
export function canonicalJson(value) {
  const ancestors = new Set();
  function serialize(current) {
    if (current === null || typeof current === 'string' || typeof current === 'boolean') return JSON.stringify(current);
    if (typeof current === 'number' && Number.isFinite(current)) return JSON.stringify(current);
    if (typeof current !== 'object' || ancestors.has(current)) throw new TypeError('Non-JSON value or cycle');
    const array = Array.isArray(current);
    if (array && Object.getPrototypeOf(current) !== Array.prototype) throw new TypeError('Plain array required');
    if (!array && Object.getPrototypeOf(current) !== Object.prototype && Object.getPrototypeOf(current) !== null) throw new TypeError('Plain object required');
    const keys = Reflect.ownKeys(current);
    if (keys.some((key) => typeof key !== 'string')) throw new TypeError('Symbol key');
    if (array && (keys.length !== current.length + 1 || !keys.includes('length'))) throw new TypeError('Sparse or extended array');
    const contentKeys = array ? Array.from({ length: current.length }, (_, index) => String(index)) : keys.sort();
    for (const key of contentKeys) {
      const descriptor = Object.getOwnPropertyDescriptor(current, key);
      if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) throw new TypeError('Non-JSON property');
    }
    ancestors.add(current);
    const result = array
      ? `[${contentKeys.map((key) => serialize(current[key])).join(',')}]`
      : `{${contentKeys.map((key) => `${JSON.stringify(key)}:${serialize(current[key])}`).join(',')}}`;
    ancestors.delete(current);
    return result;
  }
  return serialize(value);
}

function safeSize(value) {
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError('Nonnegative safe integer required');
}

export function accountCaps(sizes, cap) {
  safeSize(cap);
  if (!Array.isArray(sizes)) throw new TypeError('Size array required');
  let total = 0;
  for (const size of sizes) {
    safeSize(size);
    if (size > cap - total) throw new RangeError('Byte cap exceeded');
    total += size;
  }
  return total;
}

function validatePath(path) {
  if (typeof path !== 'string' || !path || /[\\\x00-\x1f\x7f:%?#]/u.test(path) || path.startsWith('/') || path.split('/').some((part) => !part || part === '.' || part === '..')) throw new TypeError('Unsafe relative path');
}

function indexEntries(entries) {
  if (!Array.isArray(entries)) throw new TypeError('Inventory array required');
  const index = new Map();
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') throw new TypeError('Inventory entry required');
    validatePath(entry.path);
    safeSize(entry.size);
    if (!/^[a-f0-9]{64}$/u.test(entry.sha256) || typeof entry.mime !== 'string' || !entry.mime) throw new TypeError('Hash and MIME metadata required');
    if (index.has(entry.path)) throw new Error('Duplicate inventory path');
    index.set(entry.path, entry);
  }
  return index;
}

// Caller supplies filesystem type and bytes. No traversal or native MIME decode occurs here.
export function verifyPublicInventory(expected, actual, cap) {
  const wanted = indexEntries(expected);
  const observed = indexEntries(actual);
  if (wanted.size !== observed.size) throw new Error('Inventory count mismatch');
  const sizes = [];
  for (const [path, entry] of observed) {
    const match = wanted.get(path);
    if (!match || entry.type !== 'file') throw new Error('Extra path or non-file');
    const content = bytes(entry.bytes);
    if (content.byteLength !== entry.size || entry.size !== match.size || entry.mime !== match.mime || entry.sha256 !== match.sha256 || sha256Bytes(content) !== match.sha256) throw new Error('Artifact byte or metadata mismatch');
    sizes.push(content.byteLength);
  }
  return { files: observed.size, bytes: accountCaps(sizes, cap) };
}

// Controlled synthetic marker scan only; not a complete privacy/leak detector.
export function scanSyntheticPrivacy(value, sentinels) {
  const content = bytes(value);
  if (!Array.isArray(sentinels) || sentinels.length === 0) throw new TypeError('Nonempty synthetic sentinel list required');
  const validated = [];
  for (let index = 0; index < sentinels.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(sentinels, String(index));
    if (!descriptor || !Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'string' || !descriptor.value) throw new TypeError('Every own sentinel must be a nonempty string');
    validated.push(descriptor.value);
  }
  return [...new Set(validated)].filter((sentinel) => {
    const marker = new TextEncoder().encode(sentinel);
    for (let offset = 0; offset <= content.length - marker.length; offset += 1) {
      if (marker.every((byte, index) => byte === content[offset + index])) return true;
    }
    return false;
  });
}
