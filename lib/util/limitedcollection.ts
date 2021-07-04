import { Collection } from "discord.js";

export class LimitedCollection<K, T> extends Collection<K, T> {
  maxSize: number;

  constructor(maxSize = 0, iterable = null) {
    super(iterable);
    this.maxSize = maxSize;
  }

  set(key: K, value: T) {
    if (this.maxSize === 0) return this;
    if (this.size >= this.maxSize && !this.has(key))
      this.delete(this.firstKey());
    return super.set(key, value);
  }

  static get [Symbol.species]() {
    return Collection;
  }
}
