import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Plus, MoreHorizontal, Pencil, Trash2, Search, Loader2 } from 'lucide-react';
import CivicsQuestionDialog from '@/components/admin/CivicsQuestionDialog';
import { useContentManager } from '@/hooks/useContentManager';

const difficultyColor = {
  easy: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  hard: "bg-red-100 text-red-800",
};

const versionColor = {
  "2008": "bg-blue-100 text-blue-800",
  "2025": "bg-purple-100 text-purple-800",
};

export default function CivicsQuestionsTab() {
  const { items: questions, isLoading, isSubmitting, fetchItems, createItem, updateItem, deleteItem } = useContentManager('CivicsQuestion', 'civics question');
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

  const filtered = questions.filter(q =>
    q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (q.category || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input type="search" placeholder="Search questions..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <Button onClick={() => { setEditingItem(null); setIsDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> Add Question
        </Button>
      </div>
      <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="w-[40%]">Question</TableHead>
              <TableHead className="w-[30%]">Answer</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center h-32 text-slate-500">No civics questions found.</TableCell></TableRow>
            ) : (
              filtered.map((q) => (
                <TableRow key={q.id}>
                  <TableCell className="font-medium text-slate-800">{q.question}</TableCell>
                  <TableCell className="text-slate-600">{q.answer}</TableCell>
                  <TableCell><Badge variant="secondary" className="bg-slate-100 text-slate-600">{q.category || "—"}</Badge></TableCell>
                  <TableCell><Badge className={versionColor[q.version] || "bg-gray-100"}>{q.version}</Badge></TableCell>
                  <TableCell><Badge className={difficultyColor[q.difficulty] || "bg-gray-100"}>{q.difficulty}</Badge></TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => { setEditingItem(q); setIsDialogOpen(true); }}><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => deleteItem(q.id)} className="text-red-600 focus:text-red-600"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <CivicsQuestionDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} onSubmit={handleSubmit} initialData={editingItem} isSubmitting={isSubmitting} />
    </div>
  );
}