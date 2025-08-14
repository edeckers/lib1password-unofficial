export interface Section {
  reset: () => void;
  show: () => void;
}

export interface WithUpdate<T> {
  update: (v: T) => void;
}
