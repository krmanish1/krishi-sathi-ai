export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;

export type RecordValues<T extends Record<string, unknown>> = T[keyof T];

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
