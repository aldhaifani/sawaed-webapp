"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

interface DropdownItem {
  id: string | number;
  label: string;
  icon?: React.ReactNode;
}

interface BasicDropdownProps {
  label: string;
  items: DropdownItem[];
  onChange?: (item: DropdownItem) => void;
  className?: string;
  selectedId?: string | number; // controlled selected value
}

export default function BasicDropdown({
  label,
  items,
  onChange,
  className = "",
  selectedId,
}: BasicDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DropdownItem | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [openUpwards, setOpenUpwards] = useState(false);

  const handleItemSelect = (item: DropdownItem) => {
    setSelectedItem(item);
    setIsOpen(false);
    onChange?.(item);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync internal selected item when selectedId or items change
  useEffect(() => {
    if (selectedId === undefined || selectedId === null || selectedId === "") {
      setSelectedItem(null);
      return;
    }
    const found =
      items.find((it) => String(it.id) === String(selectedId)) ?? null;
    setSelectedItem(found);
  }, [selectedId, items]);

  // Decide whether to open upwards based on available viewport space
  useLayoutEffect(() => {
    function recompute() {
      if (!isOpen || !buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const estimatedMenuHeight = Math.min(
        320,
        Math.max(200, items.length * 40),
      );
      const shouldOpenUp =
        spaceBelow < estimatedMenuHeight && spaceAbove > spaceBelow;
      setOpenUpwards(shouldOpenUp);
    }
    recompute();
    window.addEventListener("resize", recompute);
    window.addEventListener("scroll", recompute, true);
    return () => {
      window.removeEventListener("resize", recompute);
      window.removeEventListener("scroll", recompute, true);
    };
  }, [isOpen, items.length]);

  return (
    <div ref={dropdownRef} className={`relative inline-block ${className}`}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        className="bg-background hover:bg-secondary flex w-full items-center justify-between gap-2 rounded-lg border px-4 py-2 text-start transition-colors"
      >
        <span className="block truncate">
          {selectedItem ? selectedItem.label : label}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="h-4 w-4" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={menuRef}
            className={`bg-background absolute z-50 w-full rounded-lg border shadow-lg ltr:left-0 rtl:right-0 ${
              openUpwards
                ? "bottom-full mb-1 origin-bottom"
                : "top-full mt-1 origin-top"
            }`}
            initial={{ opacity: 0, y: -10, scaleY: 0.8 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{
              opacity: 0,
              y: -10,
              scaleY: 0.8,
              transition: { duration: 0.2 },
            }}
            transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
          >
            <ul
              className="py-2"
              role="menu"
              aria-orientation="vertical"
              aria-labelledby="dropdown-button"
            >
              {items.map((item) => (
                <motion.li
                  key={item.id}
                  role="menuitem"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="block"
                  whileHover={{ x: 5 }}
                >
                  <button
                    onClick={() => handleItemSelect(item)}
                    type="button"
                    className={`flex w-full items-center px-4 py-2 text-start text-sm ${
                      selectedItem?.id === item.id
                        ? "text-brand font-medium"
                        : ""
                    }`}
                  >
                    {item.icon && (
                      <span className="ltr:mr-2 rtl:ml-2">{item.icon}</span>
                    )}
                    {item.label}

                    {selectedItem?.id === item.id && (
                      <motion.span
                        className="ltr:ml-auto rtl:mr-auto"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          damping: 20,
                        }}
                      >
                        <svg
                          className="text-brand h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </motion.span>
                    )}
                  </button>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
