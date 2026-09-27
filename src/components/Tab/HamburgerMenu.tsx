import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Menu, Coffee, ExternalLink, Info, History } from '../Icons';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useModalStore } from '../../stores/modalStore';

export const HamburgerMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const { openAboutModal, openChangelogModal } = useModalStore();

  useClickOutside(menuRef, () => setIsOpen(false));

  // Update menu position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.right - 180, // Align right edge (180px is menu width)
      });
    }
  }, [isOpen]);

  const handleAboutClick = () => {
    openAboutModal();
    setIsOpen(false);
  };

  const handleChangelogClick = () => {
    openChangelogModal();
    setIsOpen(false);
  };

  const handleKofiClick = () => {
    window.open('https://ko-fi.com/scratchtabs', '_blank');
    setIsOpen(false);
  };

  const handleFeedbackClick = () => {
    window.open('https://github.com/girishbuilds/scratch-tabs/issues/new', '_blank');
    setIsOpen(false);
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-1 hover:bg-themed-hover rounded transition-colors"
        title="Menu"
        aria-label="Menu"
      >
        <Menu size={16} />
      </button>

      {isOpen && createPortal(
        <div
          ref={menuRef}
          className="fixed bg-surface border border-base rounded shadow-lg z-context-menu py-1"
          style={{
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`,
            minWidth: '180px'
          }}
        >
          <button
            onClick={handleAboutClick}
            className="w-full px-3 py-2 text-left text-xs text-main hover:bg-themed-hover flex items-center space-x-2"
          >
            <Info size={14} />
            <span>About</span>
          </button>
          <button
            onClick={handleChangelogClick}
            className="w-full px-3 py-2 text-left text-xs text-main hover:bg-themed-hover flex items-center space-x-2"
          >
            <History size={14} />
            <span>What's New</span>
          </button>
          <div className="border-t border-base my-1"></div>
          <button
            onClick={handleKofiClick}
            className="w-full px-3 py-2 text-left text-xs text-main hover:bg-themed-hover flex items-center space-x-2"
          >
            <Coffee size={14} />
            <span>Support on Ko-fi</span>
          </button>
          <button
            onClick={handleFeedbackClick}
            className="w-full px-3 py-2 text-left text-xs text-main hover:bg-themed-hover flex items-center space-x-2"
          >
            <ExternalLink size={14} />
            <span>Report Issue</span>
          </button>
        </div>,
        document.body
      )}
    </>
  );
};
