import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface SideNavProps {
  items: NavItem[];
  activeId: string;
  onSelect: (id: string) => void;
}

export default function SideNav({ items, activeId, onSelect }: SideNavProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <nav
      className={`
        flex flex-col h-full bg-vscode-sidebar-bg border-r border-vscode-panel-border
        transition-all duration-300 ease-in-out overflow-hidden
        ${isExpanded ? 'w-48' : 'w-12'}
      `}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className="flex-1 py-2">
        {items.map((item) => {
          const IconComponent = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 text-sm
                transition-colors relative group
                ${
                  activeId === item.id
                    ? 'bg-vscode-list-active-bg text-vscode-list-active-fg'
                    : 'text-vscode-sidebar-fg hover:bg-vscode-list-hover-bg'
                }
              `}
              title={!isExpanded ? item.label : undefined}
            >
              {/* Active indicator */}
              {activeId === item.id && (
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-brand-primary" />
              )}
              
              {/* Icon */}
              <IconComponent className="flex-shrink-0" size={18} strokeWidth={2} />
              
              {/* Label - fades in/out based on expansion */}
              <span
                className={`
                  whitespace-nowrap transition-all duration-300
                  ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'}
                `}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Expand/Collapse hint at bottom */}
      <div className="border-t border-vscode-panel-border p-2">
        <div className="flex items-center justify-center text-xs text-vscode-descriptionForeground">
          {isExpanded ? (
            <span>←</span>
          ) : (
            <span>→</span>
          )}
        </div>
      </div>
    </nav>
  );
}
