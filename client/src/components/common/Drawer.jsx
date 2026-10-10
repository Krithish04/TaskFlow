import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export default function Drawer({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  headerActions,
  size = 'md', // 'sm' | 'md' | 'lg' (max 580px) | 'xl' | 'full'
  className = '',
}) {
  const previousFocusRef = useRef(null);
  const drawerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement;
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);

      // Focus first focusable element inside drawer
      setTimeout(() => {
        if (drawerRef.current) {
          const focusables = drawerRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusables.length > 0) focusables[0].focus();
        }
      }, 50);

      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
        if (previousFocusRef.current) {
          previousFocusRef.current.focus();
        }
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="drawer-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        ref={drawerRef}
        className={`drawer-content drawer-${size} ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="drawer-header">
          <div className="drawer-title-group">
            {title && typeof title === 'string' ? <h3 className="drawer-title">{title}</h3> : title}
            {subtitle && <p className="drawer-subtitle">{subtitle}</p>}
          </div>

          <div className="drawer-header-actions flex items-center gap-2">
            {headerActions}
            <button
              type="button"
              className="btn-icon drawer-close"
              onClick={onClose}
              aria-label="Close drawer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="drawer-body">{children}</div>
      </div>
    </div>
  );
}
