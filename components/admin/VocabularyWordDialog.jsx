import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function VocabularyWordDialog({ open, onOpenChange, onSubmit, initialData, isSubmitting }) {
  const [formData, setFormData] = useState({
    word: "",
    category: "",
    definition: "",
  });

  useEffect(() => {
    if (open) {
      setFormData(
        initialData
          ? {
              word: initialData.word || "",
              category: initialData.category || "",
              definition: initialData.definition || "",
            }
          : { word: "", category: "", definition: "" }
      );
    }
  }, [open, initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Vocabulary Word" : "Add New Vocabulary Word"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="word">Word</Label>
            <Input
              id="word"
              value={formData.word}
              onChange={(e) => setFormData({ ...formData, word: e.target.value })}
              placeholder="e.g., amendment"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="e.g., Government"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="definition">Definition</Label>
            <Textarea
              id="definition"
              value={formData.definition}
              onChange={(e) => setFormData({ ...formData, definition: e.target.value })}
              placeholder="e.g., A change or addition to the Constitution"
              className="min-h-[80px]"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : initialData ? "Save Changes" : "Add Word"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}