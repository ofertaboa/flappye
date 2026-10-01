const stack = document.getElementById('admin-toast-stack');

export function toast(message, type = 'success') {
  if (!stack) return;
  const node = document.createElement('div');
  node.className = `admin-toast admin-toast--${type}`;
  node.textContent = message;
  stack.append(node);
  requestAnimationFrame(() => node.classList.add('is-visible'));
  setTimeout(() => {
    node.classList.remove('is-visible');
    setTimeout(() => node.remove(), 300);
  }, 3200);
}
