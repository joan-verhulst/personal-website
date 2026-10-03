/**
 * Moves one entry a step up (-1) or down (1) and returns a new list. A move
 * past either end returns the list as it was, so callers needn't check.
 *
 * @example
 * const next = move(order, index, -1);
 * setOrder(next);
 * run(() => reorderRecords(next.map((row) => row.id)), false);
 */
export const move = <T>(list: readonly T[], index: number, direction: -1 | 1) => {
  const target = index + direction;
  const next = [...list];
  if (index < 0 || index >= list.length || target < 0 || target >= list.length) {
    return next;
  }
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved);
  return next;
};
