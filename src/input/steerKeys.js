/**
 * Remap steering keys when vertical steer is active.
 * Up behaves like Right did, down like left (matching mouse/stick conventions).
 */
export function remapSteerKey(key, vertical) {
  if (!vertical) return key;
  switch (key) {
    case 'ArrowUp': return 'ArrowRight';
    case 'ArrowDown': return 'ArrowLeft';
    case 'w': return 'd';
    case 'W': return 'D';
    case 's': return 'a';
    case 'S': return 'A';
    default: return key;
  }
}
