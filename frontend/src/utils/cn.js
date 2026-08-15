/**
 * Combines multiple class names into a single string, filtering out falsy values.
 * This utility function is useful for conditionally applying classes in React components.
 * 
 * @param  {...any} classes - Any number of class names or conditional expressions that evaluate to class names
 * @returns {string} - A space-separated string of class names
 * 
 * @example
 * // Basic usage
 * cn('text-lg', 'font-bold'); // 'text-lg font-bold'
 * 
 * @example
 * // With conditional classes
 * cn('btn', isActive && 'btn-active', isDisabled && 'btn-disabled'); // 'btn btn-active' or 'btn btn-disabled' or just 'btn'
 * 
 * @example
 * // With dynamic classes from an object
 * cn('card', { 'card-highlighted': isHighlighted, 'card-selected': isSelected });
 */
export function cn(...classes) {
    return classes.filter(Boolean).join(' ');
  }
  
  /**
   * Alternative implementation that supports object syntax for conditional classes
   */
  export function classNames(...classes) {
    return classes
      .flatMap(entry => {
        if (typeof entry === 'string' || entry === null || entry === undefined) {
          return entry;
        } 
        if (typeof entry === 'object') {
          return Object.entries(entry)
            .filter(([_, value]) => Boolean(value))
            .map(([key, _]) => key);
        }
        return String(entry);
      })
      .filter(Boolean)
      .join(' ');
  }
  
  // Default export for simpler imports
  export default cn;