import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LucideIcon, Plus, SwitchCamera } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface ComponentItemProps {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  className?: string;
  isActive?: boolean;
  categories?: string[];
  currentCategory?: string;
  onChangeCategory?: (categoryName: string) => void;
}

export default function ComponentItem({ 
  icon: Icon, 
  label, 
  onClick, 
  className, 
  isActive = false,
  categories = [],
  currentCategory,
  onChangeCategory,
}: ComponentItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showCategorySwitcher, setShowCategorySwitcher] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ x: 0, y: 0 });
  const switchBtnRef = useRef<HTMLButtonElement>(null);
  
  const handlePlusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) onClick();
  };

  const handleCategorySwitchClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = switchBtnRef.current?.getBoundingClientRect();
    if (rect) {
      setDropdownPos({ x: rect.right, y: rect.bottom + 4 });
    }
    setShowCategorySwitcher(!showCategorySwitcher);
  };

  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleCategorySelect = (e: React.MouseEvent, categoryName: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (onChangeCategory) {
      onChangeCategory(categoryName);
    }
    setShowCategorySwitcher(false);
  };

  const availableCategories = categories.filter(c => c !== currentCategory);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showCategorySwitcher) return;
    const close = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowCategorySwitcher(false);
      }
    };
    // Use mousedown to catch the click before it reaches other handlers
    document.addEventListener('mousedown', close, true);
    return () => document.removeEventListener('mousedown', close, true);
  }, [showCategorySwitcher]);
  
  return (
    <div className="relative">
      <div 
        className={cn(
          "group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-subtitle transition-colors duration-150",
          isActive ? "bg-ramp-grey-700 text-primary" : "text-primary",
          isHovered ? "hover-bg" : "",
          className
        )}
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && onClick) {
            onClick();
          }
        }}
      >
        <div className="flex-shrink-0">
          <Icon size={16} className={isActive ? "text-primary" : "text-muted-foreground"} />
        </div>
        <span className="truncate">{label}</span>
        
        <div className="ml-auto flex items-center gap-0.5">
          {/* Category switcher button - visible on hover */}
          {onChangeCategory && availableCategories.length > 0 && (
            <div className="opacity-0 group-hover:opacity-100">
              <Button
                ref={switchBtnRef}
                variant="ghost"
                size="icon"
                className="h-5 w-5 hover-bg hover:text-blue-500 text-muted-foreground flex items-center justify-center"
                onClick={handleCategorySwitchClick}
                aria-label="Switch category"
                title="Switch category"
              >
                <SwitchCamera size={12} />
              </Button>
            </div>
          )}
          {/* Add button */}
          <div className="opacity-0 group-hover:opacity-100">
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 hover-bg hover:text-primary text-muted-foreground flex items-center justify-center"
              onClick={handlePlusClick}
              aria-label="Add"
            >
              <Plus size={14} />
            </Button>
          </div>
        </div>
      </div>

      {/* Category switcher dropdown - rendered via portal to avoid clipping */}
      {showCategorySwitcher && createPortal(
        <div 
          ref={dropdownRef}
          className="fixed z-[9999] w-40 bg-popover border rounded-md shadow-lg py-1 text-sm"
          style={{ left: dropdownPos.x - 160, top: dropdownPos.y }}
        >
          <div className="px-2 py-1 text-xs text-muted-foreground border-b">
            Move to category:
          </div>
          {availableCategories.map(cat => (
            <button
              key={cat}
              className="w-full text-left px-3 py-1.5 text-xs text-primary hover:bg-accent transition-colors"
              onMouseDown={(e) => handleCategorySelect(e, cat)}
            >
              {cat}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
} 