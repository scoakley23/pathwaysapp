import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Plus, MoreHorizontal, Pencil, Trash2, Search, Loader2 } from 'lucide-react';
import VocabularyWordDialog from '@/components/admin/VocabularyWordDialog';
import { useContentManager } from '@/hooks/useContentManager';

export default function VocabularyWordsTab() {
  const { items: words, isLoading, isSubmitting, fetchItems, createItem, updateItem, deleteItem } = useContentManager('VocabularyWord', 'vocabulary word');
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleSubmit = async (formData) => {
    const success = editingItem ? await updateItem(editingItem.id, formData) : await createItem(formData);
    if (success) {
      setIsDialogOpen(false);
      setEditingItem(null);
    }
  };

  const filtered = words.filter(w =>
    w.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (w.category || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (w.definition || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input type="search" placeholder="Search words..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <Button onClick={() => { setEditingItem(null); setIsDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> Add Word
        </Button>
      </div>
      <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="w-[20%]">Word</TableHead>
              <TableHead className="w-[20%]">Category</TableHead>
              <TableHead className="w-[50%]">Definition</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center h-32 text-slate-500">No vocabulary words found.</TableCell></TableRow>
            ) : (
              filtered.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="font-medium text-slate-800">{w.word}</TableCell>
                  <TableCell><Badge variant="secondary" className="bg-slate-100 text-slate-600">{w.category || "—"}</Badge></TableCell>
                  <TableCell className="text-slate-600">{w.definition || "—"}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => { setEditingItem(w); setIsDialogOpen(true); }}><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => deleteItem(w.id)} className="text-red-600 focus:text-red-600"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <VocabularyWordDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} onSubmit={handleSubmit} initialData={editingItem} isSubmitting={isSubmitting} />
    </div>
  );
}