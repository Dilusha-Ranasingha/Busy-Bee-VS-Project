export type StorageMode = "WORKSPACE" | "EXTENSION";

export interface StorageResult<T> {
  mode: StorageMode;
  data: T;
}
