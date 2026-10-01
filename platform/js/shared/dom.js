export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === 'className') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'html') node.innerHTML = value;
    else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value === true && (key === 'hidden' || key === 'disabled' || key === 'checked' || key === 'readonly')) {
      node[key] = true;
    } else if (value === false && (key === 'hidden' || key === 'disabled' || key === 'checked' || key === 'readonly')) {
      node[key] = false;
    } else if (value != null) node.setAttribute(key, value);
  });
  children.flat().forEach((child) => {
    if (child == null) return;
    node.append(child instanceof Node ? child : document.createTextNode(child));
  });
  return node;
}

export function mount(target, ...children) {
  const root = typeof target === 'string' ? document.querySelector(target) : target;
  children.flat().forEach((c) => root.append(c));
  return root;
}
