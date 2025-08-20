import { useEffect, useLayoutEffect } from "react";

function isMac(): boolean {
  return testPlatform(/^Mac/);
}

function isIPhone(): boolean {
  return testPlatform(/^iPhone/);
}

function isIPad(): boolean {
  // iPadOS 13 lies and says it's a Mac, but we can distinguish by detecting touch support.
  return [testPlatform(/^iPad/), isMac() && navigator.maxTouchPoints > 1].some(
    Boolean,
  );
}

function isIOS(): boolean {
  return [isIPhone(), isIPad()].some(Boolean);
}

function testPlatform(re: RegExp): boolean {
  return Boolean(
    typeof window !== "undefined" &&
      window.navigator != null &&
      re.test(window.navigator.platform),
  );
}

const KEYBOARD_BUFFER = 24;

export const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

interface PreventScrollOptions {
  /** Whether the scroll lock is disabled. */
  isDisabled?: boolean;
  focusCallback?: () => void;
}

function chain<T extends unknown[]>(
  ...callbacks: Array<((...args: T) => void) | undefined>
): (...args: T) => void {
  return (...args: T) => {
    for (const callback of callbacks) {
      if (typeof callback === "function") {
        callback(...args);
      }
    }
  };
}

const visualViewport =
  typeof window !== "undefined" ? window.visualViewport : undefined;

export function isScrollable(node: Element): boolean {
  const style = window.getComputedStyle(node);
  return /(auto|scroll)/.test(
    style.overflow + style.overflowX + style.overflowY,
  );
}

export function getScrollParent(node: Element): Element {
  let cur: Element | null = node;
  if (isScrollable(cur)) {
    cur = cur.parentElement;
  }
  while (cur && !isScrollable(cur)) {
    cur = cur.parentElement;
  }
  return cur ?? document.scrollingElement ?? document.documentElement;
}

// HTML input types that do not cause the software keyboard to appear.
const nonTextInputTypes = new Set([
  "checkbox",
  "radio",
  "range",
  "color",
  "file",
  "image",
  "button",
  "submit",
  "reset",
]);

// The number of active usePreventScroll calls. Used to determine whether to revert back to the original page style/scroll position
let preventScrollCount = 0;
let restore: (() => void) | undefined;

/**
 * Prevents scrolling on the document body on mount, and
 * restores it on unmount. Also ensures that content does not
 * shift due to the scrollbars disappearing.
 */
export function usePreventScroll(options: PreventScrollOptions = {}) {
  const { isDisabled } = options;

  useIsomorphicLayoutEffect(() => {
    if (isDisabled) {
      return;
    }

    preventScrollCount++;
    if (preventScrollCount === 1) {
      if (isIOS()) {
        restore = preventScrollMobileSafari();
      }
    }

    return () => {
      preventScrollCount--;
      if (preventScrollCount === 0) {
        restore?.();
      }
    };
  }, [isDisabled]);
}

function preventScrollMobileSafari() {
  let scrollable: Element | null;
  let lastY = 0;
  const onTouchStart = (e: TouchEvent) => {
    // Store the nearest scrollable parent element from the element that the user touched.
    scrollable = getScrollParent(e.target as Element);
    if (
      scrollable === document.documentElement &&
      scrollable === document.body
    ) {
      return;
    }

    // Check if there are any touches before accessing the first one
    if (e.changedTouches.length > 0) {
      lastY = e.changedTouches[0]!.pageY;
    }
  };

  const onTouchMove = (e: TouchEvent) => {
    // Prevent scrolling the window.
    if (
      !scrollable ||
      scrollable === document.documentElement ||
      scrollable === document.body
    ) {
      e.preventDefault();
      return;
    }

    // Prevent scrolling up when at the top and scrolling down when at the bottom
    // of a nested scrollable area, otherwise mobile Safari will start scrolling
    // the window instead. Unfortunately, this disables bounce scrolling when at
    // the top but it's the best we can do.
    if (e.changedTouches.length === 0) {
      return;
    }

    const y = e.changedTouches[0]!.pageY;
    const scrollTop = scrollable.scrollTop;
    const bottom = scrollable.scrollHeight - scrollable.clientHeight;

    if (bottom === 0) {
      return;
    }

    if ((scrollTop <= 0 && y > lastY) || (scrollTop >= bottom && y < lastY)) {
      e.preventDefault();
    }

    lastY = y;
  };

  const onTouchEnd = (e: TouchEvent) => {
    const target = e.target as HTMLElement;

    // Apply this change if we're not already focused on the target element
    if (isInput(target) && target !== document.activeElement) {
      e.preventDefault();

      // Apply a transform to trick Safari into thinking the input is at the top of the page
      // so it doesn't try to scroll it into view. When tapping on an input, this needs to
      // be done before the "focus" event, so we have to focus the element ourselves.
      target.style.transform = "translateY(-2000px)";
      target.focus();
      requestAnimationFrame(() => {
        target.style.transform = "";
      });
    }
  };

  const onFocus = (e: FocusEvent) => {
    const target = e.target as HTMLElement;
    if (isInput(target)) {
      // Transform also needs to be applied in the focus event in cases where focus moves
      // other than tapping on an input directly, e.g. the next/previous buttons in the
      // software keyboard. In these cases, it seems applying the transform in the focus event
      // is good enough, whereas when tapping an input, it must be done before the focus event. 🤷‍♂️
      target.style.transform = "translateY(-2000px)";
      requestAnimationFrame(() => {
        target.style.transform = "";

        // This will have prevented the browser from scrolling the focused element into view,
        // so we need to do this ourselves in a way that doesn't cause the whole page to scroll.
        if (visualViewport) {
          if (visualViewport.height < window.innerHeight) {
            // If the keyboard is already visible, do this after one additional frame
            // to wait for the transform to be removed.
            requestAnimationFrame(() => {
              scrollIntoView(target);
            });
          } else {
            // Otherwise, wait for the visual viewport to resize before scrolling so we can
            // measure the correct position to scroll to.
            visualViewport.addEventListener(
              "resize",
              () => scrollIntoView(target),
              { once: true },
            );
          }
        }
      });
    }
  };

  const onWindowScroll = () => {
    // Last resort. If the window scrolled, scroll it back to the top.
    // It should always be at the top because the body will have a negative margin (see below).
    window.scrollTo(0, 0);
  };

  // Record the original scroll position so we can restore it.
  // Then apply a negative margin to the body to offset it by the scroll position. This will
  // enable us to scroll the window to the top, which is required for the rest of this to work.
  const scrollX = window.pageXOffset;
  const scrollY = window.pageYOffset;

  const restoreStyles = chain(
    setStyle(
      document.documentElement,
      "padding-right",
      `${window.innerWidth - document.documentElement.clientWidth}px`,
    ),
  );

  // Scroll to the top. The negative margin on the body will make this appear the same.
  window.scrollTo(0, 0);

  const removeEvents = chain(
    addEvent(document, "touchstart", onTouchStart, {
      passive: false,
      capture: true,
    }),
    addEvent(document, "touchmove", onTouchMove, {
      passive: false,
      capture: true,
    }),
    addEvent(document, "touchend", onTouchEnd, {
      passive: false,
      capture: true,
    }),
    addEvent(document, "focus", onFocus, true),
    addEvent(window, "scroll", onWindowScroll),
  );

  return () => {
    // Restore styles and scroll the page back to where it was.
    restoreStyles();
    removeEvents();
    window.scrollTo(scrollX, scrollY);
  };
}

// Sets a CSS property on an element, and returns a function to revert it to the previous value.
function setStyle(element: HTMLElement, cssProperty: string, value: string) {
  const prev = element.style.getPropertyValue(cssProperty);
  element.style.setProperty(cssProperty, value);
  return () => {
    element.style.setProperty(cssProperty, prev);
  };
}

// Adds an event listener to an element, and returns a function to remove it.
function addEvent<K extends keyof GlobalEventHandlersEventMap>(
  target: Document | Window | Element,
  event: K,
  handler: (ev: GlobalEventHandlersEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions,
) {
  target.addEventListener(event, handler as EventListener, options);
  return () => {
    target.removeEventListener(event, handler as EventListener, options);
  };
}

function scrollIntoView(target: Element) {
  const root = document.scrollingElement ?? document.documentElement;
  let cur: Element | null = target;
  while (cur && cur !== root) {
    // Find the parent scrollable element and adjust the scroll position if the target is not already in view.
    const scrollable = getScrollParent(cur);
    if (
      scrollable !== document.documentElement &&
      scrollable !== document.body &&
      scrollable !== cur
    ) {
      const scrollableTop = scrollable.getBoundingClientRect().top;
      const targetTop = cur.getBoundingClientRect().top;
      const targetBottom = cur.getBoundingClientRect().bottom;
      // Buffer is needed for some edge cases
      const keyboardHeight =
        scrollable.getBoundingClientRect().bottom + KEYBOARD_BUFFER;

      if (targetBottom > keyboardHeight) {
        (scrollable as HTMLElement).scrollTop += targetTop - scrollableTop;
      }
    }
    cur = (scrollable as HTMLElement).parentElement;
  }
}

export function isInput(target: Element) {
  return (
    (target instanceof HTMLInputElement &&
      !nonTextInputTypes.has(target.type)) ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}
