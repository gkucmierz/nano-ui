/**
 * Canonical runtime type introspection (`@gkucmierz/utils` `Type` / `is` / `of` / `same` contract).
 * Zero `typeof` operator — differentiates `'nan'`, `'null'`, `'array'`, `'object'`, `'function'`, etc.
 * Enforces `UTILS-IS-CASE-01` lowercase type identifiers.
 */

const rawTag = (val) => Object.prototype.toString.call(val).slice(8, -1).toLowerCase();

export class Type {
  static UNDEFINED = 'undefined';
  static NULL = 'null';
  static BOOLEAN = 'boolean';
  static NUMBER = 'number';
  static NAN = 'nan';
  static BIGINT = 'bigint';
  static STRING = 'string';
  static SYMBOL = 'symbol';

  static OBJECT = 'object';
  static ARRAY = 'array';
  static FUNCTION = 'function';
  static ASYNC_FUNCTION = 'asyncfunction';
  static GENERATOR_FUNCTION = 'generatorfunction';
  static ASYNC_GENERATOR_FUNCTION = 'asyncgeneratorfunction';
  static CALLABLE = 'callable';

  static DATE = 'date';
  static REGEXP = 'regexp';
  static ERROR = 'error';
  static PROMISE = 'promise';
  static MAP = 'map';
  static SET = 'set';

  static of(val) {
    if (Number.isNaN(val)) return Type.NAN;
    return rawTag(val);
  }

  static isCallable(val) {
    const t = rawTag(val);
    return (
      t === 'function' ||
      t === 'asyncfunction' ||
      t === 'generatorfunction' ||
      t === 'asyncgeneratorfunction'
    );
  }

  static is(val, expected) {
    if (Array.isArray(expected)) {
      return expected.some((exp) => Type.is(val, exp));
    }
    if (expected === Type.CALLABLE) {
      return Type.isCallable(val);
    }
    if (Type.isCallable(expected)) {
      if (expected === Number) return Type.of(val) === Type.NUMBER;
      if (expected === Boolean) return rawTag(val) === Type.BOOLEAN;
      if (expected === String) return rawTag(val) === Type.STRING;
      if (expected === BigInt) return rawTag(val) === Type.BIGINT;
      if (expected === Symbol) return rawTag(val) === Type.SYMBOL;
      if (expected === Array) return Array.isArray(val);
      if (expected === Function) return Type.isCallable(val);
      if (expected === Object) return val !== null && val !== undefined && Object(val) === val;
      return val !== null && val !== undefined && Object(val) === val && val instanceof expected;
    }
    return Type.of(val) === expected;
  }

  static same(a, b) {
    return Type.of(a) === Type.of(b);
  }
}

export const Types = Type;
export const is = Type.is;
export const of = Type.of;
export const same = Type.same;
export const isCallable = Type.isCallable;
