import { useEffect } from 'react';

export function useKeyboardShortcuts(shortcuts) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Check if user is typing in an input field (unless they hit a modifier key)
      const activeEl = document.activeElement;
      const isInput = activeEl && (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName) || activeEl.isContentEditable);
      
      for (const shortcut of shortcuts) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrlKey ? (event.ctrlKey || event.metaKey) : true;
        const shiftMatch = shortcut.shiftKey ? event.shiftKey : true;
        const altMatch = shortcut.altKey ? event.altKey : true;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          // If we are in an input and the shortcut doesn't use a modifier, don't trigger
          // For example, 'k' inside an input shouldn't trigger search, but 'cmd+k' should.
          if (isInput && !shortcut.ctrlKey && !shortcut.altKey) {
            continue;
          }
          
          event.preventDefault();
          shortcut.action();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts]);
}
