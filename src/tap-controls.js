export function shouldMunchOnTileTap({ focusedIndex, tappedIndex, isPending, isTouchFirstDevice = false }) {
  return !isPending && (isTouchFirstDevice || focusedIndex === tappedIndex);
}

export function shouldMoveToEmptyOnTouchTap({ isCleared, isTouchInput }) {
  return isCleared && isTouchInput;
}
