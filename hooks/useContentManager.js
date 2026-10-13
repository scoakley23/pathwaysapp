import { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

/**
 * Shared CRUD hook for admin content management (Sentences, CivicsQuestions, VocabularyWords).
 */
export function useContentManager(entityName, itemName) {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await base44.entities[entityName].list();
      setItems(data);
    } catch (error) {
      console.error(`Failed to fetch ${itemName}s:`, error);
      toast.error(`Failed to load ${itemName}s`);
    } finally {
      setIsLoading(false);
    }
  }, [entityName, itemName]);

  const createItem = async (formData) => {
    setIsSubmitting(true);
    try {
      await base44.entities[entityName].create(formData);
      toast.success(`${itemName} added successfully`);
      fetchItems();
      return true;
    } catch (error) {
      console.error(`Failed to create ${itemName}:`, error);
      toast.error(`Failed to add ${itemName}`);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateItem = async (id, formData) => {
    setIsSubmitting(true);
    try {
      await base44.entities[entityName].update(id, formData);
      toast.success(`${itemName} updated successfully`);
      fetchItems();
      return true;
    } catch (error) {
      console.error(`Failed to update ${itemName}:`, error);
      toast.error(`Failed to update ${itemName}`);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteItem = async (id) => {
    if (!window.confirm(`Are you sure you want to delete this ${itemName}?`)) return;
    try {
      await base44.entities[entityName].delete(id);
      toast.success(`${itemName} deleted`);
      setItems((prev) => prev.filter((s) => s.id !== id));
    } catch (error) {
      console.error(`Failed to delete ${itemName}:`, error);
      toast.error(`Failed to delete ${itemName}`);
    }
  };

  return { items, isLoading, isSubmitting, fetchItems, createItem, updateItem, deleteItem };
}