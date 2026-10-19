import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { canonicalJson, sha256Bytes, utf8Bytes, accountCaps, verifyPublicInventory, scanSyntheticPrivacy } from './helpers/m3-parallel-qa-oracle.mjs';

const encode = (value) => new TextEncoder().encode(value);
const abcHash = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
const item = () => ({ path: 'safe/a.txt', bytes: encode('abc'), type: 'file', size: 3, sha256: abcHash, mime: 'text/plain' });
const expected = [{ path: 'safe/a.txt', size: 3, sha256: abcHash, mime: 'text/plain' }];

test('literal SHA vectors and canonical JSON golden vector', () => {
  assert.equal(sha256Bytes(encode('')), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  assert.equal(sha256Bytes(encode('abc')), abcHash);
  assert.equal(canonicalJson({ b: 2, a: 1 }), '{"a":1,"b":2}');
  assert.equal(sha256Bytes(encode(canonicalJson({ b: 2, a: 1 }))), '43258cff783fe7036d8a43033f830adfc60ec037382473548ac742b888292777');
  assert.notEqual(sha256Bytes(encode('abd')), abcHash);
  assert.throws(() => sha256Bytes('abc'));
});

test('canonical JSON preserves array order, Unicode and whitespace', () => {
  assert.equal(canonicalJson({ z: [' Việt ', 2, 1], a: null }), '{"a":null,"z":[" Việt ",2,1]}');
  assert.notEqual(canonicalJson([1, 2]), canonicalJson([2, 1]));
  assert.equal(utf8Bytes('ệ'), 3);
  assert.equal(utf8Bytes(' a '), 3);
});

test('canonical JSON rejects non-JSON values without coercion', () => {
  const cycle = {}; cycle.self = cycle;
  const custom = Object.create({ inherited: true }); custom.a = 1;
  const symbolKey = { a: 1 }; symbolKey[Symbol('hidden')] = 2;
  const accessor = {}; Object.defineProperty(accessor, 'a', { enumerable: true, get: () => 1 });
  for (const value of [undefined, NaN, Infinity, 1n, () => 1, Symbol('x'), new Date(), new Map(), custom, cycle, [, 1], [undefined], { a: undefined }, symbolKey, accessor]) {
    assert.throws(() => canonicalJson(value));
  }
  const array = [1]; array.extra = 2;
  assert.throws(() => canonicalJson(array));
  class CustomArray extends Array {}
  assert.throws(() => canonicalJson(new CustomArray(1, 2)));
});

test('cap accounting accepts boundary and rejects cap+1 or unsafe arithmetic', () => {
  assert.equal(accountCaps([2, 3], 5), 5);
  assert.throws(() => accountCaps([2, 4], 5));
  for (const size of [-1, 1.1, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => accountCaps([size], 10));
  assert.throws(() => accountCaps([Number.MAX_SAFE_INTEGER, 1], Number.MAX_SAFE_INTEGER));
  assert.throws(() => accountCaps([1], -1));
});

test('exact public inventory verifies actual small bytes', () => {
  assert.deepEqual(verifyPublicInventory(expected, [item()], 3), { files: 1, bytes: 3 });
  assert.deepEqual(verifyPublicInventory([], [], 0), { files: 0, bytes: 0 });
});

test('inventory rejects missing, extra, duplicate, unsafe paths and links', () => {
  assert.throws(() => verifyPublicInventory(expected, [], 10));
  assert.throws(() => verifyPublicInventory([], [item()], 10));
  assert.throws(() => verifyPublicInventory(expected, [item(), item()], 10));
  assert.throws(() => verifyPublicInventory([...expected, ...expected], [item()], 10));
  for (const path of ['/safe/a.txt', '../a', 'safe/../a', './a', 'a//b', 'a\\b', 'a\0b', 'https://example.test/a', '%2e%2e/a', 'a?x=1', 'a#fragment', 'C:/a']) {
    assert.throws(() => verifyPublicInventory([{ ...expected[0], path }], [{ ...item(), path }], 10));
  }
  assert.throws(() => verifyPublicInventory(expected, [{ ...item(), type: 'symlink' }], 10));
  assert.throws(() => verifyPublicInventory(expected, [{ ...item(), type: 'hardlink' }], 10));
  assert.throws(() => verifyPublicInventory(expected, [{ ...item(), type: 'directory' }], 10));
});

test('inventory rejects mutation, metadata mismatch, cap and missing byte evidence', () => {
  for (const change of [{ bytes: encode('abd') }, { size: 4 }, { sha256: '0'.repeat(64) }, { mime: 'image/webp' }, { bytes: 'abc' }]) {
    assert.throws(() => verifyPublicInventory(expected, [{ ...item(), ...change }], 10));
  }
  assert.throws(() => verifyPublicInventory(expected, [item()], 2));
  assert.throws(() => verifyPublicInventory([{ ...expected[0], size: -1 }], [item()], 10));
});

test('synthetic privacy scan reports controlled markers only', () => {
  assert.deepEqual(scanSyntheticPrivacy(encode('safe PRIVATE_UID_TEST end'), ['PRIVATE_UID_TEST', 'TOKEN_TEST']), ['PRIVATE_UID_TEST']);
  assert.deepEqual(scanSyntheticPrivacy(encode('safe'), ['TOKEN_TEST']), []);
  assert.deepEqual(scanSyntheticPrivacy(encode('Việt'), ['Việt']), ['Việt']);
  assert.throws(() => scanSyntheticPrivacy(encode('x'), ['']));
  assert.throws(() => scanSyntheticPrivacy(encode('x'), []));
  assert.throws(() => scanSyntheticPrivacy(encode('x'), new Array(1)));
  assert.throws(() => scanSyntheticPrivacy(encode('x'), ['TOKEN_TEST', , 'PRIVATE_UID_TEST']));
  assert.throws(() => scanSyntheticPrivacy(encode('x'), ['TOKEN_TEST', 1]));
  assert.throws(() => scanSyntheticPrivacy(encode('x'), ['TOKEN_TEST', undefined]));
  const inherited = new Array(1);
  Object.setPrototypeOf(inherited, { 0: 'TOKEN_TEST' });
  assert.throws(() => scanSyntheticPrivacy(encode('x'), inherited));
  const customIterator = ['TOKEN_TEST'];
  customIterator[Symbol.iterator] = function* () {};
  assert.deepEqual(scanSyntheticPrivacy(encode('TOKEN_TEST'), customIterator), ['TOKEN_TEST']);
  const accessor = ['TOKEN_TEST'];
  Object.defineProperty(accessor, '0', { get: () => 'TOKEN_TEST' });
  assert.throws(() => scanSyntheticPrivacy(encode('TOKEN_TEST'), accessor));
  assert.throws(() => utf8Bytes(123));
});

test('owned matrix traces every AC with unique IDs and explicit evidence boundaries', async () => {
  const matrix = JSON.parse(await readFile(new URL('./fixtures/m3-parallel-qa-matrix.json', import.meta.url), 'utf8'));
  assert.equal(new Set(matrix.cases.map((entry) => entry.id)).size, matrix.cases.length);
  for (let ac = 1; ac <= 18; ac += 1) {
    const key = `M3-AC${String(ac).padStart(2, '0')}`;
    assert.ok(matrix.cases.some((entry) => entry.acs.includes(key)), key);
    assert.deepEqual(matrix.acCoverage[key], matrix.cases.filter((entry) => entry.acs.includes(key)).map((entry) => entry.id));
  }
  for (const entry of matrix.cases) {
    for (const key of ['id', 'inputs', 'steps', 'expected', 'oracle', 'evidenceNeeded', 'sideEffects']) assert.ok(typeof entry[key] === 'string' && entry[key].length > 0, `${entry.id}:${key}`);
    assert.ok(entry.dependencies.length > 0);
    assert.ok(entry.targetTasks.length > 0);
    assert.equal(entry.productStatus, 'NOT_RUN');
    assert.equal(entry.checkAuthorization, 'HOLD');
  }
});
