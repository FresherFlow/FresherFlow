export interface MMKVConfiguration {
  id?: string;
  path?: string;
  encryptionKey?: string;
}

export class MMKV {
  constructor(configuration?: MMKVConfiguration);
  set(key: string, value: string | number | boolean): void;
  getString(key: string): string | undefined;
  getNumber(key: string): number | undefined;
  getBoolean(key: string): boolean | undefined;
  delete(key: string): void;
  clearAll(): void;
}
