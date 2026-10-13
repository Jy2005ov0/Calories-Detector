// Lists the person put in their own order (plan days, exercises in a day). No imports, so the store can use it.

/** A list in a saved order, or as it is when the saved order doesn't fit it (the plan changed since). */
export function inOrder<T>(list: T[], order?: number[]): T[] {
  if (!order || order.length !== list.length || new Set(order).size !== list.length || order.some((i) => !(i >= 0 && i < list.length))) return list;
  return order.map((i) => list[i]);
}
