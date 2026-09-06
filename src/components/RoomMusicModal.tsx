import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Music, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX,
  X, 
  Disc3, 
  Upload, 
  Trash2, 
  SkipForward, 
  SkipBack, 
  FastForward,
  Rewind,
  ListMusic,
  FolderOpen
} from 'lucide-react';
import { 
  roomAudioEngine, 
  CustomSong 
} from '@/utils/roomAudioEffects';
import { toast } from 'sonner';

interface RoomMusicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize?: () => void;
  isHost?: boolean;
  isSeated?: boolean;
  onSendSoundAnnouncement?: (title: string) => void;
  onBroadcastSync?: (song: CustomSong | null, isPlaying: boolean, currentTime?: number) => void;
}

export default function RoomMusicModal({
  isOpen,
  onClose,
  onMinimize,
  isHost,
  isSeated,
  onSendSoundAnnouncement,
  onBroadcastSync
}: RoomMusicModalProps) {
  const [songs, setSongs] = useState<CustomSong[]>(() => roomAudioEngine.getSongList());
  const [playbackInfo, setPlaybackInfo] = useState(() => roomAudioEngine.getCurrentPlaybackInfo());
  const [volume, setVolume] = useState(() => roomAudioEngine.getVolume());
  const [showPlaylist, setShowPlaylist] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);

  // Subscribe to audio engine updates
  useEffect(() => {
    const unsubscribe = roomAudioEngine.subscribe(() => {
      setSongs([...roomAudioEngine.getSongList()]);
      setPlaybackInfo(roomAudioEngine.getCurrentPlaybackInfo());
      setVolume(roomAudioEngine.getVolume());
    });
    return () => unsubscribe();
  }, []);

  if (!isOpen) return null;

  // File selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const added = roomAudioEngine.addSongsFromFiles(files);
    if (added.length > 0) {
      toast.success(`🎶 Added ${added.length} song${added.length > 1 ? 's' : ''}!`);
      roomAudioEngine.playSong(added[0]);
      onBroadcastSync?.(added[0], true, 0);
    } else {
      toast.error('Please select valid audio files (MP3, WAV, M4A, OGG, AAC)');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTogglePlay = (song?: CustomSong) => {
    const targetSong = song || playbackInfo.currentSong || songs[0];
    if (!targetSong) {
      fileInputRef.current?.click();
      return;
    }
    const isCurrentPlaying = playbackInfo.isPlaying && (!song || playbackInfo.currentSong?.id === song.id);
    roomAudioEngine.togglePlayPause(targetSong);
    onBroadcastSync?.(targetSong, !isCurrentPlaying, playbackInfo.currentTime);
    if (onSendSoundAnnouncement && !isCurrentPlaying) {
      onSendSoundAnnouncement(`🎵 Playing: ${targetSong.title}`);
    }
  };

  const handleNext = () => {
    roomAudioEngine.playNextSong();
    const info = roomAudioEngine.getCurrentPlaybackInfo();
    onBroadcastSync?.(info.currentSong, true, 0);
  };

  const handlePrev = () => {
    roomAudioEngine.playPrevSong();
    const info = roomAudioEngine.getCurrentPlaybackInfo();
    onBroadcastSync?.(info.currentSong, true, 0);
  };

  const handleSkipForward = () => {
    roomAudioEngine.skipForward(10);
  };

  const handleSkipBackward = () => {
    roomAudioEngine.skipBackward(10);
  };

  const handleDeleteSong = (e: React.MouseEvent, songId: string) => {
    e.stopPropagation();
    roomAudioEngine.removeSong(songId);
    toast.info('Song removed 🗑️');
  };

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSeekProgress = (clientX: number) => {
    if (!progressBarRef.current || playbackInfo.duration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const pct = clickX / rect.width;
    const targetSeconds = pct * playbackInfo.duration;
    roomAudioEngine.seek(targetSeconds);
    onBroadcastSync?.(playbackInfo.currentSong, playbackInfo.isPlaying, targetSeconds);
  };

  const progressPercent = playbackInfo.duration > 0 
    ? Math.min(100, Math.max(0, (playbackInfo.currentTime / playbackInfo.duration) * 100)) 
    : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-4 select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-sm sm:max-w-md bg-[#0e0a22] border border-red-500/40 rounded-3xl p-4 sm:p-5 shadow-[0_0_50px_rgba(239,68,68,0.25)] space-y-4 text-white overflow-hidden"
      >
        {/* Hidden File Input */}
        <input 
          ref={fileInputRef}
          type="file"
          accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* 1. Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 text-white flex items-center justify-center shadow-lg shadow-red-500/30">
              <Music size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">Music Player</h3>
              <p className="text-[10px] text-red-300">HQ Room Audio • All listeners will hear</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowPlaylist(!showPlaylist)}
              className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                showPlaylist ? 'bg-red-600 text-white shadow' : 'bg-white/5 text-zinc-300 hover:bg-white/10'
              }`}
            >
              <ListMusic size={15} />
              <span>{songs.length}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-zinc-300 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* 2. Playlist Drawer (when toggled) */}
        <AnimatePresence>
          {showPlaylist && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-black/50 border border-white/10 rounded-2xl p-3 space-y-2 max-h-48 overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-400">Song List ({songs.length})</span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[11px] font-bold text-red-400 hover:text-red-300 flex items-center gap-1"
                >
                  <FolderOpen size={13} /> + Add Songs
                </button>
              </div>

              {songs.length > 0 ? (
                <div className="space-y-1">
                  {songs.map((song, idx) => {
                    const isCur = playbackInfo.currentSong?.id === song.id;
                    return (
                      <div
                        key={song.id}
                        onClick={() => handleTogglePlay(song)}
                        className={`p-2 rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                          isCur 
                            ? 'bg-red-600/30 border border-red-500/50 text-white font-bold' 
                            : 'bg-white/5 border border-white/5 hover:bg-white/10 text-zinc-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-mono opacity-60 w-4 text-center">{idx + 1}</span>
                          <div className="min-w-0">
                            <h4 className="text-xs truncate max-w-[190px]">{song.title}</h4>
                            <span className="text-[9px] text-zinc-400">{song.fileSize || 'Audio Track'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {isCur && playbackInfo.isPlaying && (
                            <span className="text-xs text-red-400 animate-pulse">🎵</span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => handleDeleteSong(e, song.id)}
                            className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-4 text-center text-xs text-zinc-400">
                  <p>No songs loaded yet.</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Tap below to select MP3 songs from your phone.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3. Main Player Card */}
        <div className="bg-gradient-to-b from-black/60 to-black/80 border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col items-center text-center relative overflow-hidden">
          
          {/* Animated Vinyl Disc Art */}
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 my-1 flex items-center justify-center">
            {/* Red Vocal Waves Pulse when playing */}
            {playbackInfo.isPlaying && (
              <>
                <motion.div
                  animate={{ scale: [1, 1.35, 1], opacity: [0.7, 0, 0.7] }}
                  transition={{ repeat: Infinity, duration: 1.4, ease: 'easeOut' }}
                  className="absolute inset-0 rounded-full border-2 border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.8)]"
                />
                <motion.div
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ repeat: Infinity, duration: 1.8, ease: 'easeOut', delay: 0.2 }}
                  className="absolute inset-0 rounded-full border border-rose-400"
                />
              </>
            )}

            <motion.div
              animate={{ rotate: playbackInfo.isPlaying ? 360 : 0 }}
              transition={{ repeat: Infinity, duration: 5, ease: 'linear' }}
              className="w-full h-full rounded-full bg-gradient-to-tr from-zinc-900 via-zinc-800 to-black border-4 border-red-500/40 shadow-2xl flex items-center justify-center relative overflow-hidden"
            >
              {/* Disc Grooves */}
              <div className="absolute inset-2 rounded-full border border-white/10" />
              <div className="absolute inset-5 rounded-full border border-white/10" />
              <div className="absolute inset-8 rounded-full border border-white/10" />
              
              {/* Center Label */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-red-600 to-rose-500 text-white flex items-center justify-center shadow">
                <Disc3 size={20} className={playbackInfo.isPlaying ? 'animate-spin' : ''} />
              </div>
            </motion.div>
          </div>

          {/* Song Title & Artist */}
          <div className="mt-3 w-full px-2">
            <h2 className="text-sm sm:text-base font-black text-white truncate max-w-[280px] mx-auto">
              {playbackInfo.currentSong?.title || (songs.length > 0 ? songs[0].title : 'No Song Playing')}
            </h2>
            <p className="text-[11px] text-zinc-400 mt-0.5 truncate">
              {playbackInfo.currentSong ? 'Device Audio (HQ Stream)' : 'Select song from files below'}
            </p>
          </div>

          {/* 4. Seek / Progress Bar (Clickable & Draggable) */}
          <div className="w-full mt-4 space-y-1">
            <div 
              ref={progressBarRef}
              onClick={(e) => handleSeekProgress(e.clientX)}
              className="w-full h-2.5 bg-white/10 rounded-full cursor-pointer relative overflow-hidden group py-1"
            >
              <div 
                className="h-full bg-gradient-to-r from-red-500 via-rose-500 to-amber-400 rounded-full transition-all duration-100"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            
            {/* Timestamp Labels */}
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 px-0.5">
              <span>{formatTime(playbackInfo.currentTime)}</span>
              <span>{formatTime(playbackInfo.duration)}</span>
            </div>
          </div>

          {/* 5. Player Controls: Prev, -10s, Play/Pause, +10s, Next */}
          <div className="flex items-center justify-center gap-3 sm:gap-4 mt-3">
            {/* Prev Song */}
            <button
              type="button"
              onClick={handlePrev}
              title="Previous Track"
              className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-all active:scale-95"
            >
              <SkipBack size={16} />
            </button>

            {/* Skip Back 10s */}
            <button
              type="button"
              onClick={handleSkipBackward}
              title="Rewind 10 seconds"
              className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-all active:scale-95"
            >
              <Rewind size={15} />
            </button>

            {/* Play / Pause Big Button */}
            <button
              type="button"
              onClick={() => handleTogglePlay()}
              title={playbackInfo.isPlaying ? 'Pause' : 'Play'}
              className="w-14 h-14 rounded-full bg-gradient-to-tr from-red-600 via-rose-500 to-red-500 text-white flex items-center justify-center shadow-[0_0_25px_rgba(239,68,68,0.7)] hover:scale-105 active:scale-95 transition-transform"
            >
              {playbackInfo.isPlaying ? (
                <Pause size={24} className="fill-white stroke-[2.5]" />
              ) : (
                <Play size={24} className="fill-white stroke-[2.5] ml-1" />
              )}
            </button>

            {/* Skip Forward 10s */}
            <button
              type="button"
              onClick={handleSkipForward}
              title="Forward 10 seconds"
              className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-all active:scale-95"
            >
              <FastForward size={15} />
            </button>

            {/* Next Song */}
            <button
              type="button"
              onClick={handleNext}
              title="Next Track"
              className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-all active:scale-95"
            >
              <SkipForward size={16} />
            </button>
          </div>

          {/* 6. Volume Slider */}
          <div className="w-full max-w-[220px] mt-4 flex items-center gap-2.5 bg-black/40 px-3 py-1.5 rounded-full border border-white/5">
            <button 
              type="button"
              onClick={() => roomAudioEngine.setVolume(volume > 0 ? 0 : 0.8)}
              className="text-zinc-400 hover:text-white"
            >
              {volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} className="text-red-400" />}
            </button>
            <input 
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => roomAudioEngine.setVolume(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-red-500"
            />
            <span className="text-[10px] font-mono text-zinc-400 w-7 text-right">
              {Math.round(volume * 100)}%
            </span>
          </div>
        </div>

        {/* 7. Bottom Select Files Action Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-red-600 via-rose-500 to-red-600 hover:from-red-500 hover:to-rose-600 text-white font-black text-xs shadow-[0_0_20px_rgba(239,68,68,0.4)] flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
        >
          <Upload size={16} className="stroke-[2.5]" />
          <span>Select Song from Phone / File Manager (फाइल से सॉन्ग चुनें)</span>
        </button>
      </motion.div>
    </div>
  );
}
