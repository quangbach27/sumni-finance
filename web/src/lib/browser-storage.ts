/**
 * BrowserStorage
 *
 * A tiny, typed wrapper around a single Web Storage key.
 *
 * Usage examples:
 *
 * Store and retrieve JSON in sessionStorage under the key 'garden':
 * ```
 * const storage = new BrowserStorage<{ plants: string[] }>('garden');
 * storage.setItem({ plants: ['fern'] });
 * storage.getItem(); // { plants: ['fern'] } or null
 * ```
 *
 * Store and retrieve JSON in localStorage under the key 'forest':
 * ```
 * const storage = new BrowserStorage('forest', { persist: true });
 * ```
 *
 * Store query-string formatted data in sessionStorage under the key 'jungle':
 * ```
 * import querystring from 'querystring';
 * const storage = new BrowserStorage('jungle', {
 *   serialize: querystring.stringify,
 *   deserialize: querystring.parse,
 * });
 * ```
 *
 * Check for failures:
 * ```
 * if (!storage.setItem(data)) console.warn(storage.getLastError());
 * ```
 */
interface BrowserStorageOptions<T = unknown> {
  persist?: boolean;
  storage?: Storage;
  /** Defaults to JSON.stringify. */
  serialize?: (value: T) => string;
  /** Defaults to JSON.parse. */
  deserialize?: (raw: string) => T;
}

export default class BrowserStorage<T = unknown> {
  readonly rootKey: string;
  lastError: unknown;

  private readonly storage: Storage;
  private readonly serialize: (value: T) => string;
  private readonly deserialize: (raw: string) => T;

  constructor(rootKey: string, options: BrowserStorageOptions<T> = {}) {
    this.rootKey = rootKey;
    this.storage =
      options.storage ??
      (options.persist ? globalThis.localStorage : globalThis.sessionStorage);

    this.serialize = options.serialize ?? ((value) => JSON.stringify(value));
    this.deserialize = options.deserialize ?? ((raw) => JSON.parse(raw) as T);
  }

  private run = <TRun>(func: () => TRun): TRun | null => {
    this.lastError = undefined;
    try {
      return func();
    } catch (e) {
      this.lastError = e;
      return null;
    }
  };

  /** Returns the stored value, or `null` if missing or on error (see `getLastError`). */
  getItem = (): T | null =>
    this.run(() => {
      const raw = this.storage.getItem(this.rootKey);
      return raw === null ? null : this.deserialize(raw);
    });

  /** Returns `true` if the value was saved. */
  setItem = (value: T): boolean =>
    this.run(() => {
      this.storage.setItem(this.rootKey, this.serialize(value));
      return true;
    }) ?? false;

  /** Returns `true` if the key was removed (or did not exist). */
  removeItem = (): boolean =>
    this.run(() => {
      this.storage.removeItem(this.rootKey);
      return true;
    }) ?? false;

  /** The error from the most recent call, or `undefined` if it succeeded. */
  getLastError = (): unknown => this.lastError;
}
