import { useEffect } from 'react';

/**
 * Global D-pad navigation hook for TV remotes.
 * Arrow keys move focus between focusable elements.
 * Enter/Space triggers click on focused element.
 * Left/Right switches between panels (categories ↔ channels).
 */
export function useDpadNavigation() {
  useEffect(() => {
    function getFocusableElements(): HTMLElement[] {
      return Array.from(
        document.querySelectorAll<HTMLElement>(
          'button:not([disabled]):not([tabindex="-1"]), ' +
          '[tabindex="0"], ' +
          'input:not([disabled]), ' +
          'a[href]:not([tabindex="-1"])'
        )
      ).filter((el) => {
        // Must be visible
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
    }

    function getElementCenter(el: HTMLElement) {
      const rect = el.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }

    function findBestCandidate(
      current: HTMLElement,
      direction: 'up' | 'down' | 'left' | 'right'
    ): HTMLElement | null {
      const elements = getFocusableElements();
      const from = getElementCenter(current);
      let best: HTMLElement | null = null;
      let bestScore = Infinity;

      for (const el of elements) {
        if (el === current) continue;
        const to = getElementCenter(el);
        const dx = to.x - from.x;
        const dy = to.y - from.y;

        // Check direction
        let valid = false;
        let primaryDist = 0;
        let secondaryDist = 0;

        switch (direction) {
          case 'up':
            valid = dy < -10;
            primaryDist = Math.abs(dy);
            secondaryDist = Math.abs(dx);
            break;
          case 'down':
            valid = dy > 10;
            primaryDist = Math.abs(dy);
            secondaryDist = Math.abs(dx);
            break;
          case 'left':
            valid = dx < -10;
            primaryDist = Math.abs(dx);
            secondaryDist = Math.abs(dy);
            break;
          case 'right':
            valid = dx > 10;
            primaryDist = Math.abs(dx);
            secondaryDist = Math.abs(dy);
            break;
        }

        if (!valid) continue;

        // Score: heavily penalize cross-panel jumps (large secondary distance)
        // This keeps navigation within the same column/panel
        const score = primaryDist + secondaryDist * 10;
        if (score < bestScore) {
          bestScore = score;
          best = el;
        }
      }

      return best;
    }

    function handleKeyDown(e: KeyboardEvent) {
      // Skip if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        // Allow arrow keys to escape input
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          const next = findBestCandidate(e.target as HTMLElement, e.key === 'ArrowDown' ? 'down' : 'up');
          if (next) {
            e.preventDefault();
            next.focus();
            next.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
        }
        return;
      }

      const active = document.activeElement as HTMLElement;
      if (!active || active === document.body) {
        // Nothing focused — focus first focusable element
        if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
          const first = getFocusableElements()[0];
          if (first) {
            e.preventDefault();
            first.focus();
            first.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
        }
        return;
      }

      let direction: 'up' | 'down' | 'left' | 'right' | null = null;
      switch (e.key) {
        case 'ArrowUp': direction = 'up'; break;
        case 'ArrowDown': direction = 'down'; break;
        case 'ArrowLeft': direction = 'left'; break;
        case 'ArrowRight': direction = 'right'; break;
        case 'Enter':
        case ' ':
          // Click the focused element
          if (!(active instanceof HTMLInputElement)) {
            e.preventDefault();
            active.click();
          }
          return;
      }

      if (direction) {
        const next = findBestCandidate(active, direction);
        if (next) {
          e.preventDefault();
          next.focus();
          next.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, []);
}
