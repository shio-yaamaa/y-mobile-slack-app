// Returns the type of the target in lowercase
// Distinguishes 'array' and 'null' from 'object'
export const typeOf = (target: any): string => {
  return typeof target === 'object'
    ? Object.prototype.toString.call(target).split(' ')[1].slice(0, -1).toLowerCase()
    : typeof target;
};