import { Globe, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LANGUAGES } from '@/hooks/useLessonTranslation';

export default function LanguageSelector({ language, onLanguageChange, translating }) {
  return (
    <Select value={language} onValueChange={onLanguageChange} disabled={translating}>
      <SelectTrigger className="w-[140px] h-9">
        {translating ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2 text-blue-600" />
        ) : (
          <Globe className="w-4 h-4 mr-2 text-slate-500" />
        )}
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LANGUAGES.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}