export function shouldMunchOnTileTap({ focusedIndex, tappedIndex, isPending, isTouchFirstDevice = false }) {
  return !isPending && (isTouchFirstDevice || focusedIndex === tappedIndex);
}
