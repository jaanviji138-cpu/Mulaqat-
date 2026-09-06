import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield, X, Search, Trash2, Copy, Filter,
  UserX, MicOff, Mic, Armchair, Lock, Unlock,
  Globe, Clock, Check, AlertTriangle, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

export interface AdminLogItem {
  id: string;
  actionType:
    | 'take_seat'
    | 'leave_seat'
    | 'shift_seat'
    | 'remove_seat'
    | 'lock_seat'
    | 'unlock_seat'
    | 'mute_user'
    | 'unmute_user'
    | 'kick_user'
    | 'unkick_user'
    | 'change_privacy'
    | 'change_theme'
    | 'gift_sent'
    | 'host_stage_return';
  category: 'seat' | 'moderation' | 'audio' | 'settings';
  actorId: string;
  actorName: string;
  actorPhoto?: string;
  targetId?: string;
  targetName?: string;
  targetPhoto?: string;
  seatIndex?: number;
  details: string;
  timestamp: number;
}

interface AdminHistoryLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: AdminLogItem[];
  isHost: boolean;
  onClearLogs?: () => void;
  onUnkickUser?: (targetUid: string, targetName: string) => void;
  onUnmuteUser?: (seatIdx: number) => void;
}

export default function AdminHistoryLogModal({
  isOpen,
  onClose,
  logs,
  isHost,
  onClearLogs,
  onUnkickUser,
  onUnmuteUser
}: AdminHistoryLogModalProps) {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'seat' | 'moderation' | 'audio' | 'settings'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedLogs, setCopiedLogs] = useState(false);

  if (!isOpen) return null;

  // Filter logs
  const filteredLogs = logs.filter(log => {
    // Category match
    if (selectedFilter !== 'all' && log.category !== selectedFilter) {
      return false;
    }
    // Search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDetails = log.details?.toLowerCase().includes(q);
      const matchActor = log.actorName?.toLowerCase().includes(q);
      const matchTarget = log.targetName?.toLowerCase().includes(q);
      const matchAction = log.actionType?.toLowerCase().includes(q);
      return matchDetails || matchActor || matchTarget || matchAction;
    }
    return true;
  });

  const getActionBadge = (actionType: AdminLogItem['actionType']) => {
    switch (actionType) {
      case 'kick_user':
        return {
          label: 'KICKED',
          bg: 'bg-red-500/20 text-red-400 border-red-500/40',
          icon: <UserX size={12} className="text-red-400" />
        };
      case 'unkick_user':
        return {
          label: 'UNBANNED',
          bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
          icon: <Check size={12} className="text-emerald-400" />
        };
      case 'mute_user':
        return {
          label: 'MUTED',
          bg: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
          icon: <MicOff size={12} className="text-amber-400" />
        };
      case 'unmute_user':
        return {
          label: 'UNMUTED',
          bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
          icon: <Mic size={12} className="text-emerald-400" />
        };
      case 'take_seat':
      case 'shift_seat':
        return {
          label: 'SEAT SHIFT',
          bg: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
          icon: <Armchair size={12} className="text-cyan-400" />
        };
      case 'leave_seat':
      case 'remove_seat':
        return {
          label: 'SEAT VACATED',
          bg: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/40',
          icon: <Armchair size={12} className="text-zinc-400" />
        };
      case 'lock_seat':
        return {
          label: 'SEAT LOCKED',
          bg: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
          icon: <Lock size={12} className="text-purple-400" />
        };
      case 'unlock_seat':
        return {
          label: 'SEAT UNLOCKED',
          bg: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
          icon: <Unlock size={12} className="text-blue-400" />
        };
      case 'change_privacy':
        return {
          label: 'PRIVACY',
          bg: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40',
          icon: <Globe size={12} className="text-indigo-400" />
        };
      case 'host_stage_return':
        return {
          label: 'STAGE PODIUM',
          bg: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
          icon: <Shield size={12} className="text-yellow-400" />
        };
      default:
        return {
          label: 'ACTION',
          bg: 'bg-white/10 text-white border-white/20',
          icon: <Shield size={12} className="text-white" />
        };
    }
  };

  const formatTimestamp = (ts: number) => {
    if (!ts) return 'Just now';
    const diffSeconds = Math.floor((Date.now() - ts) / 1000);
    if (diffSeconds < 60) return 'Just now';
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleCopyLogs = () => {
    if (filteredLogs.length === 0) {
      toast.info('No logs to copy');
      return;
    }
    const textData = filteredLogs.map(l => 
      `[${new Date(l.timestamp).toLocaleTimeString()}] [${l.actionType.toUpperCase()}] ${l.actorName}: ${l.details}`
    ).join('\n');

    try {
      navigator.clipboard.writeText(textData);
      setCopiedLogs(true);
      setTimeout(() => setCopiedLogs(false), 2500);
      toast.success('Admin logs copied to clipboard! 📋');
    } catch (e) {
      toast.error('Could not copy logs');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        className="w-full max-w-lg bg-zinc-950/95 border border-cyan-500/40 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.25)] flex flex-col max-h-[88vh]"
      >
        {/* Modal Header */}
        <div className="p-4 bg-gradient-to-r from-cyan-950/60 via-blue-950/60 to-purple-950/60 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <Shield size={20} className="text-black" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-black text-white">Room Admin Logs</h2>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-black border border-cyan-400/30">
                  {logs.length} Total
                </span>
              </div>
              <p className="text-xs text-zinc-400">Real-time seat changes, mutes & kicks tracking</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer active:scale-95"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-3 bg-black/40 border-b border-white/5 space-y-2.5">
          {/* Search bar */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search actions, user names, or IDs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-8 py-1.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-400 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
            {[
              { id: 'all', label: 'All Actions', count: logs.length },
              { id: 'moderation', label: 'Kicks 🚫', count: logs.filter(l => l.category === 'moderation').length },
              { id: 'seat', label: 'Seats 🪑', count: logs.filter(l => l.category === 'seat').length },
              { id: 'audio', label: 'Mutes 🔇', count: logs.filter(l => l.category === 'audio').length },
              { id: 'settings', label: 'Settings ⚙️', count: logs.filter(l => l.category === 'settings').length },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedFilter(tab.id as any)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 transition-all flex items-center gap-1 cursor-pointer ${
                  selectedFilter === tab.id
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-black shadow-md shadow-cyan-500/20'
                    : 'bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/5'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded-full ${
                  selectedFilter === tab.id ? 'bg-black/20 text-black' : 'bg-white/10 text-zinc-400'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Logs List Container */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-white/10">
          {filteredLogs.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-500 mb-3">
                <Clock size={24} />
              </div>
              <p className="text-sm font-bold text-zinc-300">No actions recorded yet</p>
              <p className="text-xs text-zinc-500 max-w-xs mt-1">
                When users take seats, get muted, kicked, or change room settings, full records will appear here.
              </p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const badge = getActionBadge(log.actionType);
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 transition-colors flex flex-col gap-2"
                >
                  {/* Top Bar: Action Badge + Timestamp */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border flex items-center gap-1 ${badge.bg}`}>
                        {badge.icon}
                        <span>{badge.label}</span>
                      </span>
                      {log.seatIndex !== undefined && (
                        <span className="px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 text-[9px] font-bold border border-cyan-500/20">
                          Seat {log.seatIndex + 1}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1">
                      <Clock size={10} />
                      {formatTimestamp(log.timestamp)}
                    </span>
                  </div>

                  {/* Body: Actor -> Target / Details */}
                  <div className="flex items-start gap-2.5">
                    {/* Actor Avatar */}
                    <div className="relative shrink-0 mt-0.5">
                      <img
                        src={log.actorPhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                        alt={log.actorName}
                        className="w-8 h-8 rounded-full object-cover border border-white/20"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-black text-white truncate max-w-[120px]">
                          {log.actorName}
                        </span>
                        <span className="text-[11px] text-zinc-400">
                          {log.details}
                        </span>
                      </div>

                      {/* If target user exists */}
                      {log.targetName && log.targetName !== log.actorName && (
                        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-zinc-300 bg-black/40 px-2 py-0.5 rounded-lg border border-white/5 inline-flex">
                          <span className="text-zinc-500">Target:</span>
                          <span className="font-bold text-amber-300">{log.targetName}</span>
                          {log.targetId && (
                            <span className="text-[9px] font-mono text-zinc-500">({log.targetId.slice(0, 6)})</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Quick Reversal Actions for Host */}
                    {isHost && (
                      <div className="shrink-0 flex items-center gap-1">
                        {log.actionType === 'kick_user' && log.targetId && onUnkickUser && (
                          <button
                            onClick={() => onUnkickUser(log.targetId!, log.targetName || 'User')}
                            className="px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 transition-colors"
                            title="Unban User"
                          >
                            Unban
                          </button>
                        )}
                        {log.actionType === 'mute_user' && log.seatIndex !== undefined && onUnmuteUser && (
                          <button
                            onClick={() => onUnmuteUser(log.seatIndex!)}
                            className="px-2 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 text-[10px] font-bold border border-cyan-500/30 transition-colors"
                            title="Unmute Seat"
                          >
                            Unmute
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 bg-black/60 border-t border-white/10 flex items-center justify-between gap-2">
          <button
            onClick={handleCopyLogs}
            disabled={filteredLogs.length === 0}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-bold border border-white/10 flex items-center gap-1.5 transition-colors disabled:opacity-40 cursor-pointer"
          >
            {copiedLogs ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span>{copiedLogs ? 'Copied!' : 'Export Logs'}</span>
          </button>

          {isHost && onClearLogs && (
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to clear recent admin action history?')) {
                  onClearLogs();
                  toast.success('Admin logs cleared 🧹');
                }
              }}
              disabled={logs.length === 0}
              className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/20 flex items-center gap-1.5 transition-colors disabled:opacity-40 cursor-pointer"
            >
              <Trash2 size={14} />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
