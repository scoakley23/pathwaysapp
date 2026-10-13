import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function PracticeCalendar({ history }) {
  const [date, setDate] = React.useState(new Date());

  // Convert history to a set of dates for highlighting
  const practicedDates = history.reduce((acc, item) => {
    const dateStr = format(new Date(item.last_practiced), 'yyyy-MM-dd');
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(item);
    return acc;
  }, {});

  const modifiers = {
    practiced: Object.keys(practicedDates).map(d => new Date(d))
  };

  const modifiersStyles = {
    practiced: {
      backgroundColor: '#22c55e', // green-500
      color: 'white',
      fontWeight: 'bold',
      borderRadius: '100%'
    }
  };

  const selectedDayData = practicedDates[format(date || new Date(), 'yyyy-MM-dd')] || [];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-blue-600" />
          Practice Calendar
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col md:flex-row gap-8">
        <div className="flex-shrink-0 mx-auto md:mx-0">
           <div className="flex items-center gap-2 mb-2 justify-center md:justify-start">
             <div className="w-3 h-3 rounded-full bg-green-500" />
             <span className="text-xs text-slate-500">Day Practiced</span>
           </div>
           <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            modifiers={modifiers}
            modifiersStyles={modifiersStyles}
            className="rounded-md border shadow-sm bg-white p-4"
          />
        </div>
        
        <div className="flex-1 space-y-4">
            <h4 className="font-semibold text-slate-900 border-b pb-2">
                Activity for {date ? format(date, 'MMMM do, yyyy') : 'Selected Date'}
            </h4>
            
            {selectedDayData.length > 0 ? (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                    {selectedDayData.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                            {item.status === 'mastered' ? (
                                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                            ) : (
                                <div className="w-5 h-5 rounded-full border-2 border-slate-300 mt-0.5" />
                            )}
                            <div>
                                <p className="font-medium text-slate-800 text-sm">
                                    {item.sentence?.text || item.content?.text || item.content?.word || item.content?.question || "Practice Session"}
                                </p>
                                <div className="flex gap-2 mt-1">
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                        item.status === 'mastered' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'
                                    }`}>
                                        {item.status === 'mastered' ? 'Mastered' : 'Practiced'}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                        {format(new Date(item.last_practiced), 'h:mm a')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    <p>No activity recorded for this day.</p>
                </div>
            )}
        </div>
      </CardContent>
    </Card>
  );
}