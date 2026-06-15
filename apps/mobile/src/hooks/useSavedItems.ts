import { useState, useEffect } from 'react';

const savedItemIds = new Set<string>();
const listeners = new Set<() => void>();

const notifyListeners = () => {
  listeners.forEach(l => l());
};

export const useSavedItems = () => {
  const [items, setItems] = useState<Set<string>>(new Set(savedItemIds));

  useEffect(() => {
    const listener = () => {
      setItems(new Set(savedItemIds));
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const toggleSaveItem = (itemId: string) => {
    if (savedItemIds.has(itemId)) {
      savedItemIds.delete(itemId);
    } else {
      savedItemIds.add(itemId);
    }
    notifyListeners();
  };

  const isItemSaved = (itemId: string) => {
    return items.has(itemId);
  };

  return {
    isItemSaved,
    toggleSaveItem,
  };
};
