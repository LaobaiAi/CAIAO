import { ComponentGroup } from '@/data/sidebar-components';
import { useCallback, useEffect, useMemo, useState } from 'react';

export function useComponentGroups(componentGroups: ComponentGroup[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [openGroups, setOpenGroups] = useState<string[]>([]); // Start with all groups collapsed
  const [isSearching, setIsSearching] = useState(false);

  // Category management state
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [serverCategoryMap, setServerCategoryMap] = useState<Record<string, string>>({});

  // All category names (default + custom)
  const allCategories = useMemo(() => {
    const defaultCats = componentGroups.map(g => g.name);
    const allCats = new Set([...defaultCats, ...customCategories]);
    return Array.from(allCats);
  }, [componentGroups, customCategories]);

  // Get current category of an item
  const getItemCategory = useCallback((itemName: string): string | undefined => {
    for (const group of componentGroups) {
      if (group.items.some(item => item.name === itemName)) {
        return group.name;
      }
    }
    return undefined;
  }, [componentGroups]);

  // Add a new category
  const addCategory = useCallback((categoryName: string) => {
    if (categoryName && !allCategories.includes(categoryName)) {
      setCustomCategories(prev => [...prev, categoryName]);
    }
  }, [allCategories]);

  // Remove a category (only custom categories can be removed)
  const removeCategory = useCallback((categoryName: string) => {
    setCustomCategories(prev => prev.filter(c => c !== categoryName));
    // Also remove any server mappings to this category
    setServerCategoryMap(prev => {
      const next = { ...prev };
      for (const [server, cat] of Object.entries(next)) {
        if (cat === categoryName) delete next[server];
      }
      return next;
    });
  }, []);

  // Move a server to a different category
  const moveServerToCategory = useCallback((serverName: string, newCategory: string) => {
    setServerCategoryMap(prev => ({
      ...prev,
      [serverName]: newCategory,
    }));
  }, []);

  // Filter groups and items based on search query
  const filteredGroups = useMemo(() => {
    if (!searchQuery) return componentGroups;

    return componentGroups.map(group => {
      // Filter items within the group
      const filteredItems = group.items.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

      // Return group with filtered items
      return {
        ...group,
        items: filteredItems
      };
    }).filter(group => group.items.length > 0); // Only include groups with matching items
  }, [componentGroups, searchQuery]);

  // Handle search query changes
  useEffect(() => {
    if (searchQuery) {
      setIsSearching(true);
      // Open all groups that have matching items
      setOpenGroups(filteredGroups.map(group => group.name));
    } else if (isSearching) {
      // Only reset groups when exiting search mode
      setIsSearching(false);
    }
  }, [searchQuery, filteredGroups]);

  // Handle accordion value changes
  const handleAccordionChange = (value: string[]) => {
    // Only update if we're not actively searching
    if (!searchQuery) {
      setOpenGroups(value);
    } else {
      // During search, we need to preserve expanded groups that have matches
      const matchingGroups = filteredGroups.map(group => group.name);
      // Keep all matching groups open while allowing manual toggling of others
      const newValue = value.filter(group => matchingGroups.includes(group));
      if (newValue.length < matchingGroups.length) {
        // If user is closing a search result group, allow that
        setOpenGroups(newValue);
      } else {
        // User is opening a new group during search
        setOpenGroups(value);
      }
    }
  };

  return {
    searchQuery,
    setSearchQuery,
    activeItem,
    setActiveItem,
    openGroups,
    setOpenGroups,
    isSearching,
    filteredGroups,
    handleAccordionChange,
    // Category management
    allCategories,
    customCategories,
    serverCategoryMap,
    addCategory,
    removeCategory,
    moveServerToCategory,
    getItemCategory,
  };
} 