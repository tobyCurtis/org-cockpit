export function clickOutside(node: HTMLElement, callback: () => void) {
  const handle = (event: MouseEvent | TouchEvent) => {
    if (!node.contains(event.target as Node)) callback();
  };

  document.addEventListener("mousedown", handle, true);
  document.addEventListener("touchstart", handle, true);

  return {
    destroy() {
      document.removeEventListener("mousedown", handle, true);
      document.removeEventListener("touchstart", handle, true);
    }
  };
}
