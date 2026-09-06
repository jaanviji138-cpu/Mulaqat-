import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Check, Plus, Trash2, Calendar, Target, Award, ListTodo, Users, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface AgendaItem {
  id: string;
  title: string;
  isCompleted: boolean;
  completedBy?: string;
}

interface RoomAgendaProps {
  items: AgendaItem[];
  onAddItem: (title: string) => Promise<void>;
  onToggleItem: (id: string, isCompleted: boolean) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  canManage: boolean;
  currentUser: any;
}

export function RoomAgenda({
  items,
  onAddItem,
  onToggleItem,
  onDeleteItem,
  canManage,
  currentUser
}: RoomAgendaProps) {
  const [newTitle, setNewTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const completedCount = items.filter(item => item.isCompleted).length;
  const percent = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    if (!canManage) {
      toast.error("Only the Host or Super Admin can assign lounge agenda goals.");
      return;
    }

    setSubmitting(true);
    try {
      await onAddItem(newTitle.trim());
      setNewTitle('');
      toast.success("New lounge agenda item added!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add agenda item");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#111422]/60 backdrop-blur-xl border border-white/5 rounded-3xl p-5 text-left shadow-2xl relative overflow-hidden">
      {/* Decorative luxury gradient background accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF4D67]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Info */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5 relative z-10">
        <div className="flex items-center gap-2">
          <div className="bg-[#FF4D67]/10 p-2 rounded-xl border border-[#FF4D67]/20 text-[#FF4D67]">
            <ListTodo size={18} />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-1">
              Lounge Agenda Checklist
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/25">
                Co-Working
              </span>
            </h4>
            <p className="text-[9px] text-gray-400 font-bold tracking-wider mt-0.5 uppercase">Interactive goals for the room</p>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-xs font-mono font-black text-amber-400">
            {completedCount}/{items.length} Goal
          </span>
          <span className="text-[8px] font-bold text-gray-500 tracking-wider uppercase">Completed</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-5 space-y-1.5 relative z-10">
        <div className="flex justify-between text-[9px] font-black text-gray-400 uppercase tracking-widest">
          <span>Overall Alignment</span>
          <span className="text-[#FF4D67] font-mono">{percent}% Clear</span>
        </div>
        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/10 p-[1.5px]">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-[#FF4D67] via-pink-500 to-purple-600 rounded-full shadow-[0_0_10px_rgba(219,39,119,0.5)]"
          />
        </div>
      </div>

      {/* Add New Goal Form */}
      {canManage && (
        <form onSubmit={handleSubmit} className="flex gap-2 mb-4 relative z-10">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Assign next room mission / target checklist..."
            className="flex-1 text-xs h-9 bg-black/40 border-white/10 text-white rounded-xl focus-visible:ring-1 focus-visible:ring-pink-500 placeholder:text-gray-500 font-bold"
            disabled={submitting}
          />
          <Button 
            type="submit" 
            size="sm"
            className="bg-gradient-to-r from-[#FF4D67] to-pink-500 hover:from-[#E11D48] hover:to-pink-600 rounded-xl h-9 font-black uppercase text-[10px] tracking-wider px-3"
            disabled={submitting || !newTitle.trim()}
          >
            <Plus size={14} className="mr-1" /> Add
          </Button>
        </form>
      )}

      {/* Items list */}
      <div className="space-y-2 max-h-[220px] overflow-y-auto no-scrollbar relative z-10">
        <AnimatePresence initial={false}>
          {items.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-6 text-center border border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center gap-1 bg-[#100D1C]/20"
            >
              <Target size={20} className="text-gray-600 animate-pulse" />
              <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mt-1">No Agenda Items Configured</span>
              <span className="text-[8px] text-gray-500 font-bold tracking-wide uppercase">Host/Admins can add checklist targets</span>
            </motion.div>
          ) : (
            items.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -15 }}
                className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-colors ${
                  item.isCompleted 
                    ? 'bg-emerald-500/[0.04] border-emerald-500/20 text-gray-400' 
                    : 'bg-white/[0.02] border-white/5 text-white hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Styled Checklist Toggle Box */}
                  <button
                    type="button"
                    onClick={() => onToggleItem(item.id, !item.isCompleted)}
                    className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                      item.isCompleted
                        ? 'bg-gradient-to-tr from-emerald-400 to-green-500 border-emerald-400 text-black shadow-[0_0_8px_rgba(52,211,153,0.3)]'
                        : 'border-white/20 hover:border-[#FF4D67] bg-black/20'
                    }`}
                  >
                    {item.isCompleted && <Check size={12} className="stroke-[3.5]" />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-black truncate ${item.isCompleted ? 'line-through text-gray-500' : 'text-gray-100'}`}>
                      {item.title}
                    </p>
                    {item.isCompleted && item.completedBy && (
                      <span className="text-[8.5px] font-black text-emerald-400/80 uppercase tracking-wide flex items-center gap-0.5 mt-0.5 leading-none">
                        <Sparkles size={8} className="animate-spin [animation-duration:5s]" /> Completed by: {item.completedBy}
                      </span>
                    )}
                  </div>
                </div>

                {/* Delete option */}
                {canManage && (
                  <button
                    type="button"
                    onClick={() => onDeleteItem(item.id)}
                    className="p-1 px-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-white/5 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
