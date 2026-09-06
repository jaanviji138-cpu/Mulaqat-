import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, query, orderBy, onSnapshot, addDoc, 
  serverTimestamp, limit, doc, updateDoc, arrayUnion, increment, deleteDoc 
} from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, Image as ImageIcon, Send, MessageCircle, 
  Heart, Share2, Sparkles, CheckCircle2, X, Eye, 
  Camera, PlusCircle, Pin, PinOff, Trash2, MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { getPremiumAvatar } from '@/utils/avatar';

export interface MomentComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  createdAt: string;
}

export interface MomentPost {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userNumericId?: string;
  imageUrl: string;
  caption: string;
  isPinned?: boolean;
  pinnedAt?: string;
  likesCount: number;
  commentsCount: number;
  comments: MomentComment[];
  createdAt: string;
}

export default function LiveMomentsSection() {
  const { user, profile } = useAuth();
  
  // Real moments state only (no dummy moments)
  const [moments, setMoments] = useState<MomentPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  
  // Super simple upload form state: Photo + Title + Pin option
  const [titleInput, setTitleInput] = useState('');
  const [pinOnUpload, setPinOnUpload] = useState(false);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Likes, active comments tracking & zoom modal
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [openCommentTray, setOpenCommentTray] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [selectedZoomImage, setSelectedZoomImage] = useState<string | null>(null);

  const currentDisplayName = profile?.displayName || user?.displayName || 'Maxo Host';
  const currentAvatar = profile?.photoURL || user?.photoURL || getPremiumAvatar(user?.uid || 'host');
  const currentNumericId = profile?.numericId?.toString() || '789104';

  // Listen to Firestore for real community moments in real-time
  useEffect(() => {
    try {
      const q = query(
        collection(db, 'live_moments'),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setIsLoading(false);
        if (!snapshot.empty) {
          const liveList = snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              userId: data.userId || 'user',
              userName: data.userName || 'Star User',
              userAvatar: data.userAvatar || getPremiumAvatar(data.userId || 'star'),
              userNumericId: data.userNumericId || '84920',
              imageUrl: data.imageUrl || '',
              caption: data.caption || data.title || '',
              isPinned: !!data.isPinned,
              pinnedAt: data.pinnedAt || null,
              likesCount: data.likesCount || 0,
              commentsCount: Array.isArray(data.comments) ? data.comments.length : (data.commentsCount || 0),
              comments: Array.isArray(data.comments) ? data.comments : [],
              createdAt: data.createdAt || new Date().toISOString()
            } as MomentPost;
          });

          // Sort: Pinned moments at the TOP, then latest created moments
          const sorted = [...liveList].sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });

          setMoments(sorted);
        } else {
          setMoments([]);
        }
      }, (err) => {
        console.warn('Firestore live_moments listener error:', err);
        setIsLoading(false);
      });

      return () => unsubscribe();
    } catch (e) {
      console.warn('Firebase query error:', e);
      setIsLoading(false);
    }
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        toast.error('Image size must be under 8MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImagePreview(reader.result as string);
        toast.success('Photo selected! Add a title and post ✨');
      };
      reader.readAsDataURL(file);
    }
  };

  // Simple post moment with title & optional Pin
  const handleCreateMoment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedImagePreview) {
      toast.error('Please select a photo first 📸');
      return;
    }
    if (!titleInput.trim()) {
      toast.error('Please enter a title or caption for your moment ✍️');
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading('Posting your moment permanently... ✨');

    const cleanData: any = {
      userId: user?.uid || 'guest_user',
      authorId: user?.uid || 'guest_user',
      userName: currentDisplayName,
      userAvatar: currentAvatar,
      userNumericId: currentNumericId,
      imageUrl: selectedImagePreview,
      caption: titleInput.trim(),
      title: titleInput.trim(),
      isPinned: !!pinOnUpload,
      likesCount: 1,
      commentsCount: 0,
      comments: [],
      createdAt: new Date().toISOString(),
      serverTime: serverTimestamp()
    };

    if (pinOnUpload) {
      cleanData.pinnedAt = new Date().toISOString();
    }

    try {
      // Save directly to Firestore collection 'live_moments'
      const docRef = await addDoc(collection(db, 'live_moments'), cleanData);

      const createdPost: MomentPost = {
        id: docRef.id,
        userId: cleanData.userId,
        userName: cleanData.userName,
        userAvatar: cleanData.userAvatar,
        userNumericId: cleanData.userNumericId,
        imageUrl: cleanData.imageUrl,
        caption: cleanData.caption,
        isPinned: cleanData.isPinned,
        pinnedAt: cleanData.pinnedAt || undefined,
        likesCount: cleanData.likesCount,
        commentsCount: 0,
        comments: [],
        createdAt: cleanData.createdAt
      };

      setMoments(prev => {
        const filtered = prev.filter(m => m.id !== docRef.id);
        const nextList = [createdPost, ...filtered];
        return nextList.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      });

      toast.success(pinOnUpload ? '📌 Moment posted permanently and pinned to top!' : '🎉 Moment posted permanently to community!', { id: toastId });
      setSelectedImagePreview(null);
      setTitleInput('');
      setPinOnUpload(false);
      setIsUploadOpen(false);
    } catch (err: any) {
      console.error('Firestore live_moments write error:', err);
      toast.error('Failed to save moment to cloud database. Please try again.', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Pin on any moment
  const handleTogglePin = async (momentId: string, currentPinStatus?: boolean) => {
    const nextPin = !currentPinStatus;

    // Update locally and re-sort so pinned stays at the TOP
    setMoments(prev => {
      const updated = prev.map(m => m.id === momentId ? {
        ...m,
        isPinned: nextPin,
        pinnedAt: nextPin ? new Date().toISOString() : undefined
      } : m);
      return updated.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    });

    toast.success(nextPin ? '📌 Moment pinned to TOP!' : 'Moment unpinned');

    // Firestore update
    try {
      await updateDoc(doc(db, 'live_moments', momentId), {
        isPinned: nextPin,
        pinnedAt: nextPin ? new Date().toISOString() : null
      });
    } catch (e) {
      console.warn('Pin state saved locally:', e);
    }
  };

  // Delete moment
  const handleDeleteMoment = async (momentId: string) => {
    if (!confirm('Are you sure you want to delete this moment?')) return;

    setMoments(prev => prev.filter(m => m.id !== momentId));
    toast.success('Moment removed');

    try {
      await deleteDoc(doc(db, 'live_moments', momentId));
    } catch (e) {
      console.warn('Deleted locally:', e);
    }
  };

  // Like Moment
  const handleLike = async (momentId: string) => {
    const isCurrentlyLiked = likedPosts[momentId];
    setLikedPosts(prev => ({ ...prev, [momentId]: !isCurrentlyLiked }));
    
    setMoments(prev => prev.map(m => {
      if (m.id === momentId) {
        return {
          ...m,
          likesCount: isCurrentlyLiked ? Math.max(0, m.likesCount - 1) : m.likesCount + 1
        };
      }
      return m;
    }));

    if (!isCurrentlyLiked) {
      toast.success('Liked moment! ❤️');
    }

    try {
      await updateDoc(doc(db, 'live_moments', momentId), {
        likesCount: increment(isCurrentlyLiked ? -1 : 1)
      });
    } catch (e) {}
  };

  // Add Comment
  const handleAddComment = async (momentId: string) => {
    const text = (commentInputs[momentId] || '').trim();
    if (!text) {
      toast.error('Please write a comment');
      return;
    }

    const newComment: MomentComment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: user?.uid || 'guest_user',
      userName: currentDisplayName,
      userAvatar: currentAvatar,
      text: text,
      createdAt: new Date().toISOString()
    };

    setCommentInputs(prev => ({ ...prev, [momentId]: '' }));

    setMoments(prev => prev.map(m => {
      if (m.id === momentId) {
        const updatedComments = [...(m.comments || []), newComment];
        return {
          ...m,
          comments: updatedComments,
          commentsCount: updatedComments.length
        };
      }
      return m;
    }));

    toast.success('Comment added! 💬');

    try {
      await updateDoc(doc(db, 'live_moments', momentId), {
        comments: arrayUnion(newComment),
        commentsCount: increment(1)
      });
    } catch (e) {
      console.warn('Comment saved locally:', e);
    }
  };

  const toggleCommentTray = (momentId: string) => {
    setOpenCommentTray(prev => ({ ...prev, [momentId]: !prev[momentId] }));
  };

  return (
    <div className="w-full space-y-4 select-none">
      
      {/* 1. MOMENTS HEADER & SIMPLE UPLOAD BUTTON */}
      <div className="bg-gradient-to-r from-[#170928] via-[#240A34] to-[#120722] border border-purple-500/30 rounded-3xl p-4 shadow-xl backdrop-blur-2xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-lg shrink-0">
            <Camera size={20} className="stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>Live Moments Feed</span>
              {moments.some(m => m.isPinned) && (
                <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[9px] font-black uppercase flex items-center gap-0.5">
                  <Pin size={9} /> Pinned Active
                </span>
              )}
            </h3>
            <p className="text-[11px] text-zinc-300">
              फोटो पोस्ट करें, अपनी पसंद की पोस्ट पिन करें और लाइक/कमेंट शेयर करें।
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={() => setIsUploadOpen(!isUploadOpen)}
          className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 hover:opacity-95 text-white font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
        >
          {isUploadOpen ? <X size={15} /> : <PlusCircle size={15} />}
          <span>{isUploadOpen ? 'Close' : 'Upload Moment'}</span>
        </Button>
      </div>

      {/* 2. SIMPLE MOMENT UPLOAD FORM (PHOTO + TITLE + PIN OPTION) */}
      <AnimatePresence>
        {isUploadOpen && (
          <motion.form
            initial={{ opacity: 0, height: 0, scale: 0.98 }}
            animate={{ opacity: 1, height: 'auto', scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.98 }}
            onSubmit={handleCreateMoment}
            className="bg-[#100820] border-2 border-amber-400/40 rounded-3xl p-4 sm:p-5 shadow-2xl backdrop-blur-2xl space-y-3.5 relative overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <Upload size={16} className="text-amber-400" />
                <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
                  Post Moment (फोटो और टाइटल डालें)
                </h4>
              </div>
              <span className="text-[10px] text-amber-300 font-bold bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                Simple & Instant
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              
              {/* Photo Selector */}
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-amber-400/40 hover:border-amber-400 rounded-2xl p-3 bg-black/40 hover:bg-black/60 transition-all cursor-pointer min-h-[140px] group relative">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageSelect} 
                  className="hidden" 
                />
                {selectedImagePreview ? (
                  <div className="relative w-full h-36 rounded-xl overflow-hidden shadow-md">
                    <img 
                      src={selectedImagePreview} 
                      alt="Moment Preview" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs font-bold text-white bg-black/80 px-2.5 py-1 rounded-xl border border-white/20">
                        Change Photo 📷
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center space-y-1.5 py-3">
                    <div className="w-11 h-11 rounded-2xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-300 shadow">
                      <ImageIcon size={22} />
                    </div>
                    <p className="text-xs font-black text-white">Select Photo from Gallery</p>
                    <p className="text-[10.5px] text-amber-200 font-medium">फोटो चुनें</p>
                  </div>
                )}
              </label>

              {/* Title & Pin Option & Post */}
              <div className="flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase text-zinc-300 flex items-center gap-1">
                    <MessageSquare size={12} className="text-amber-400" />
                    <span>Title / Caption (टाइटल लिखें)</span>
                  </label>
                  <Input
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    placeholder="e.g. Tonight live broadcast ready! Join my room 🔥"
                    className="h-10 bg-black/60 border-white/15 text-xs text-white placeholder:text-zinc-500 rounded-xl focus:border-amber-400"
                  />

                  {/* Pin Option Checkbox */}
                  <label className="flex items-center gap-2 p-2 bg-black/40 rounded-xl border border-amber-400/20 cursor-pointer hover:border-amber-400/50 transition-all">
                    <input 
                      type="checkbox"
                      checked={pinOnUpload}
                      onChange={(e) => setPinOnUpload(e.target.checked)}
                      className="w-4 h-4 rounded accent-amber-400 cursor-pointer"
                    />
                    <div className="flex items-center gap-1 text-[11px] font-bold text-amber-300">
                      <Pin size={12} className="fill-amber-400/20" />
                      <span>Pin this moment to Top (इस मोमेंट को सबसे ऊपर पिन करें)</span>
                    </div>
                  </label>
                </div>
                
                <Button
                  type="submit"
                  disabled={isSubmitting || !selectedImagePreview}
                  className="w-full h-10 rounded-xl bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 hover:opacity-95 text-white font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Send size={13} />
                  <span>{isSubmitting ? 'Uploading Moment...' : 'Post Moment (मोमेंट शेयर करें)'}</span>
                </Button>
              </div>

            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* 3. MOMENTS LIST-BY-LIST VERTICAL FEED (FULL-WIDTH / FULL SCREEN VIEW WITH PIN FEATURE) */}
      <div className="space-y-4 pt-1">
        {isLoading ? (
          <div className="p-8 text-center text-zinc-400 text-xs">Loading moments...</div>
        ) : moments.length === 0 ? (
          <div className="bg-black/40 border border-white/10 rounded-3xl p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 mx-auto flex items-center justify-center">
              <Camera size={24} />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-black text-white">No Moments Shared Yet</p>
              <p className="text-[11px] text-zinc-400 max-w-xs mx-auto">
                पहला मोमेंट अपलोड करें और लाइव कम्युनिटी में सबसे ऊपर शेयर करें!
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsUploadOpen(true)}
              className="bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 text-white font-black text-xs rounded-xl"
            >
              <Upload size={13} className="mr-1" />
              Upload First Moment
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {moments.map((moment) => {
              const isLiked = likedPosts[moment.id];
              const isCommentsOpen = openCommentTray[moment.id];
              const commentsList = moment.comments || [];
              const isPinned = moment.isPinned;

              return (
                <motion.div
                  key={moment.id}
                  initial={false}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-3xl border transition-all p-4 shadow-2xl backdrop-blur-xl flex flex-col justify-between space-y-3 relative ${
                    isPinned 
                      ? 'bg-gradient-to-b from-[#1E0E32] to-[#120722] border-amber-400/60 shadow-[0_0_30px_rgba(251,191,36,0.18)] ring-1 ring-amber-400/30'
                      : 'bg-[#100922]/95 border-white/10 hover:border-purple-500/40'
                  }`}
                >
                  {/* Pinned Top Banner */}
                  {isPinned && (
                    <div className="flex items-center justify-between pb-1 border-b border-amber-400/20 text-amber-300">
                      <div className="flex items-center gap-1.5 text-[10.5px] font-black uppercase tracking-wider">
                        <Pin size={13} className="fill-amber-400 text-amber-400 animate-bounce" />
                        <span>Pinned by Creator / Host (पिन किया गया मोमेंट)</span>
                      </div>
                      <span className="text-[9px] bg-amber-400/20 px-2 py-0.5 rounded-full border border-amber-400/30 font-bold">
                        Top Priority
                      </span>
                    </div>
                  )}

                  {/* Author Header & Pin Toggle Option */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <img 
                        src={moment.userAvatar} 
                        alt={moment.userName} 
                        className="w-10 h-10 rounded-full object-cover border-2 border-amber-400/80 shadow-md"
                      />
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-black text-white">{moment.userName}</span>
                          <CheckCircle2 size={13} className="text-emerald-400 fill-emerald-400/20" />
                        </div>
                        <div className="flex items-center gap-2 text-[9.5px] text-zinc-400">
                          <span className="font-mono">ID: {moment.userNumericId || '84920'}</span>
                          <span>•</span>
                          <span>{new Date(moment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons (Pin Toggle & Delete) */}
                    <div className="flex items-center gap-1.5">
                      {/* PIN / UNPIN BUTTON */}
                      <button
                        type="button"
                        onClick={() => handleTogglePin(moment.id, isPinned)}
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 border ${
                          isPinned
                            ? 'bg-amber-400 text-black border-amber-300 shadow-md'
                            : 'bg-white/5 hover:bg-white/15 text-zinc-300 border-white/10'
                        }`}
                        title={isPinned ? 'Unpin this moment' : 'Pin this moment to top'}
                      >
                        {isPinned ? <PinOff size={12} /> : <Pin size={12} />}
                        <span>{isPinned ? 'Pinned' : 'Pin to Top'}</span>
                      </button>

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteMoment(moment.id)}
                        className="p-1.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-zinc-400 hover:text-red-300 transition-all cursor-pointer"
                        title="Delete moment"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Title / Caption Text */}
                  <p className="text-xs sm:text-sm font-semibold text-zinc-100 leading-relaxed bg-black/40 p-3 rounded-2xl border border-white/5">
                    {moment.caption}
                  </p>

                  {/* Moment Photo (Full-Width High-Impact Display + Tap for Fullscreen) */}
                  <div 
                    onClick={() => setSelectedZoomImage(moment.imageUrl)}
                    className="relative w-full rounded-2xl overflow-hidden border border-white/10 cursor-pointer shadow-xl group/img bg-black/60 min-h-[220px] max-h-[480px] flex items-center justify-center"
                  >
                    <img 
                      src={moment.imageUrl} 
                      alt="Moment" 
                      className="w-full h-full max-h-[480px] object-cover sm:object-contain group-hover/img:scale-[1.02] transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                      <span className="px-3.5 py-1.5 rounded-xl bg-black/85 text-xs font-bold text-white flex items-center gap-1.5 shadow-lg border border-white/20">
                        <Eye size={14} /> Tap for Fullscreen View
                      </span>
                    </div>
                  </div>

                  {/* Like & Comment Bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <div className="flex items-center gap-4">
                      {/* LIKE BUTTON */}
                      <button
                        type="button"
                        onClick={() => handleLike(moment.id)}
                        className={`flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer active:scale-125 ${
                          isLiked 
                            ? 'text-rose-500 font-black' 
                            : 'text-zinc-300 hover:text-rose-400'
                        }`}
                      >
                        <Heart 
                          size={18} 
                          className={isLiked ? 'fill-rose-500 text-rose-500' : 'text-zinc-300'} 
                        />
                        <span>{moment.likesCount} {moment.likesCount === 1 ? 'Like' : 'Likes'}</span>
                      </button>

                      {/* COMMENT BUTTON */}
                      <button
                        type="button"
                        onClick={() => toggleCommentTray(moment.id)}
                        className={`flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                          isCommentsOpen 
                            ? 'text-amber-400 font-black' 
                            : 'text-zinc-300 hover:text-amber-300'
                        }`}
                      >
                        <MessageCircle size={18} className={isCommentsOpen ? 'text-amber-400' : ''} />
                        <span>{commentsList.length} {commentsList.length === 1 ? 'Comment' : 'Comments'}</span>
                      </button>
                    </div>

                    {/* Share button */}
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        toast.success('Moment link copied! 🔗');
                      }}
                      className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer"
                      title="Share"
                    >
                      <Share2 size={15} />
                    </button>
                  </div>

                  {/* Comments Section */}
                  <AnimatePresence>
                    {isCommentsOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 pt-3 border-t border-white/10 space-y-2.5"
                      >
                        {/* Comments List */}
                        <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                          {commentsList.length === 0 ? (
                            <p className="text-[10.5px] text-zinc-500 text-center py-2 italic">
                              No comments yet. Write the first comment! ✍️
                            </p>
                          ) : (
                            commentsList.map((comm) => (
                              <div key={comm.id} className="flex items-start gap-2 bg-black/50 p-2.5 rounded-xl border border-white/5">
                                <img 
                                  src={comm.userAvatar} 
                                  alt={comm.userName} 
                                  className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5 border border-amber-400/40"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-black text-white leading-none">
                                      {comm.userName}
                                    </span>
                                    <span className="text-[8.5px] text-zinc-500">
                                      {new Date(comm.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <p className="text-xs text-zinc-300 mt-1 leading-snug break-words">
                                    {comm.text}
                                  </p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Comment Input Box */}
                        <div className="flex items-center gap-1.5 pt-1">
                          <Input
                            value={commentInputs[moment.id] || ''}
                            onChange={(e) => setCommentInputs(prev => ({ ...prev, [moment.id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddComment(moment.id);
                              }
                            }}
                            placeholder="Write a comment..."
                            className="h-8 text-xs bg-black/60 border-white/15 text-white placeholder:text-zinc-500 rounded-xl focus:border-amber-400"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleAddComment(moment.id)}
                            className="h-8 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-rose-500 hover:opacity-95 text-white font-black text-xs shrink-0 cursor-pointer"
                          >
                            <Send size={12} />
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. FULLSCREEN IMAGE MODAL */}
      <AnimatePresence>
        {selectedZoomImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedZoomImage(null)}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-3 sm:p-6"
          >
            <div className="w-full max-w-2xl flex items-center justify-between mb-3 text-white">
              <span className="text-xs font-bold text-zinc-300">Fullscreen Moment View</span>
              <button
                onClick={() => setSelectedZoomImage(null)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer shadow-lg transition-all"
              >
                <X size={20} />
              </button>
            </div>
            
            <div 
              onClick={(e) => e.stopPropagation()}
              className="max-w-2xl max-h-[85vh] w-full rounded-3xl overflow-hidden border border-white/20 shadow-2xl bg-black flex items-center justify-center"
            >
              <img 
                src={selectedZoomImage} 
                alt="Full View" 
                className="w-full h-full object-contain max-h-[80vh]"
              />
            </div>
            
            <p className="text-xs text-zinc-400 mt-3 font-medium">Tap anywhere or press X to close</p>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
