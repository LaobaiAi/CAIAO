
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface ComponentActionsProps {
  onAddCategory?: (categoryName: string) => void;
  onDeleteCategory?: (categoryName: string) => void;
  customCategories?: string[];
}

export function ComponentActions({ onAddCategory, onDeleteCategory, customCategories = [] }: ComponentActionsProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState('');

  const handleAddCategory = () => {
    if (newCategoryName.trim() && onAddCategory) {
      onAddCategory(newCategoryName.trim());
      setNewCategoryName('');
      setIsAdding(false);
    }
  };

  const handleDeleteCategory = () => {
    if (deleteTarget && onDeleteCategory) {
      onDeleteCategory(deleteTarget);
      setDeleteTarget('');
      setIsDeleting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddCategory();
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setNewCategoryName('');
    }
  };

  return (
    <div className="p-2 flex justify-between flex-shrink-0 items-center border-b mt-4">
      <span className="text-primary text-sm font-medium ml-4">CAIAO Component</span>
      <div className="flex items-center gap-0.5 mr-2">
        {isAdding ? (
          <div className="flex items-center gap-1">
            <Input
              autoFocus
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                if (!newCategoryName.trim()) setIsAdding(false);
              }}
              placeholder="Category name..."
              className="h-6 w-36 text-xs"
            />
          </div>
        ) : isDeleting ? (
          <div className="flex items-center gap-1">
            <select
              autoFocus
              value={deleteTarget}
              onChange={(e) => setDeleteTarget(e.target.value)}
              onBlur={() => { if (!deleteTarget) setIsDeleting(false); }}
              className="h-6 w-36 text-xs bg-background border rounded px-1"
            >
              <option value="">Select...</option>
              {customCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-red-500 hover:text-red-400"
              onClick={handleDeleteCategory}
              disabled={!deleteTarget}
              title="Delete selected category"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-primary hover-bg"
              onClick={() => setIsAdding(true)}
              aria-label="Add category"
              title="Add new category"
            >
              <Plus size={16} />
            </Button>
            {customCategories.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive hover-bg"
                onClick={() => setIsDeleting(true)}
                aria-label="Delete category"
                title="Delete category"
              >
                <Minus size={16} />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
