// Lists the person put in their own order (plan days, exercises in a day). No imports, so the store can use it.

/** A list in a saved order, or as it is when the saved order doesn't fit it (the plan changed since). */
export function inOrder<T>(list: T[], order?: number[]): T[] {
  if (!order || order.length !== list.length || new Set(order).size !== list.length || order.some((i) => !(i >= 0 && i < list.length))) return list;
  return order.map((i) => list[i]);
}

/** Move one item in a saved order (starting from the original order). */
export function moveInOrder(order: number[] | undefined, length: number, from: number, to: number): number[] {
  const base = inOrder(Array.from({ length }, (_, i) => i), order);
  if (to < 0 || to >= length || from === to) return base;
  const [item] = base.splice(from, 1);
  base.splice(to, 0, item);
  return base;
}
