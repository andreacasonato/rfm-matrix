const count = (n: number) => n.toLocaleString('en-US');

/** "1 order", "2 orders", with thousands separators. */
export const plural = (n: number, one: string, many = `${one}s`) =>
  `${count(n)} ${n === 1 ? one : many}`;
