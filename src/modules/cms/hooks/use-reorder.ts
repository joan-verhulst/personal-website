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
