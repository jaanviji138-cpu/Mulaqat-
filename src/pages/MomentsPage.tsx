import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { db, safeOnSnapshot } from '@/lib/firebase';
import { collection, query, addDoc, doc, updateDoc, deleteDoc, orderBy, limit, increment } from 'firebase/firestore';
import { 
  MessageSquare, Heart, Trash2, Image as ImageIcon, Plus, X, Sparkles, 
  Check, ChevronLeft, ChevronRight, Video, Gift, Coins, ShieldCheck,
  Copy, Volume2, VolumeX, MessageCircle, Phone
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'motion/react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { getPremiumAvatar } from '@/utils/avatar';
import { FullScreenGiftAnimation } from '@/components/FullScreenGiftAnimation';
import { INITIAL_VIDEO_HOSTS, VideoHost } from '@/data/videoHosts';

// Gradient presets for text-only Story creation
const PRESET_GRADIENTS = [
  'from-pink-500 via-purple-600 to-indigo-500',
  'from-amber-400 to-pink-600',
  'from-teal-400 to-emerald-600',
  'from-purple-600 via-[#8A2387] to-[#E94057]',
  'from-[#11998e] to-[#38ef7d]',
  'from-[#00c6ff] to-[#0072ff]'
];

// Rich aesthetic default backgrounds for Moments
const momentPresets = [
  { name: 'Live DJ Night', url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=600&auto=format&fit=crop' },
  { name: 'Dubai View', url: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=600&auto=format&fit=crop' },
  { name: 'Lounge Vibe', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=600&auto=format&fit=crop' },
  { name: 'Studio Chill', url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=600&auto=format&fit=crop' }
];

interface QuickGift {
  id: string;
  name: string;
  icon: string;
  coins: number;
}

const QUICK_MOMENT_GIFTS: QuickGift[] = [
  { id: 'g_rose', name: 'Red Rose', icon: '🌹', coins: 100 },
  { id: 'g_heart', name: 'Love Heart', icon: '💖', coins: 500 },
  { id: 'g_crown', name: 'Golden Crown', icon: '👑', coins: 1000 },
  { id: 'g_car', name: 'Sports Car', icon: '🏎️', coins: 5000 },
  { id: 'g_tajmahal', name: 'Taj Mahal', icon: '🏰', coins: 25000 }
];

interface Story {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  imageUrl?: string;
  videoUrl?: string;
  mediaType?: 'image' | 'video' | 'text';
  bgColorClass?: string;
  text?: string;
  createdAt: string;
  expiresAt: string;
  reactions?: Record<string, number>;
}

interface MomentPost {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  title?: string;
  content: string;
  image?: string;
  images?: string[];
  likes: string[]; // List of user IDs who liked
  likesCount: number;
  commentsCount: number;
  timeLabel: string;
  createdAt: any;
  reactions?: Record<string, string[]>;
}

export default function MomentsPage() {
  const navigate = useNavigate();
  const { profile: selfProfile } = useAuth();

  // Host Profile Modal state for Moments
  const [selectedHostForProfile, setSelectedHostForProfile] = useState<VideoHost | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [playingVoice, setPlayingVoice] = useState(false);

  const handleOpenHostProfileFromMoment = (post: MomentPost) => {
    const matched = INITIAL_VIDEO_HOSTS.find(h => 
      h.id === post.userId || 
      h.name.toLowerCase().trim() === post.userName.toLowerCase().trim()
    ) || {
      id: post.userId || 'host_priya_sharma',
      numericId: '1000',
      name: post.userName,
      age: 22,
      avatar: post.userPhoto,
      coverPhoto: post.image || post.userPhoto,
      photos: [post.userPhoto, post.image || post.userPhoto],
      bio: post.content || 'Party Queen 🌸 | Love singing & 1-on-1 private video calls',
      status: 'online',
      ratePerMinute: 1500,
      languages: ['Hindi', 'English'],
      tags: ['Live', 'Glamour', 'Music'],
      city: 'Mumbai',
      callCount: 120,
      rating: 5.0,
      isVerified: true,
      voiceNoteText: 'Hey sweetheart! Tap call to talk with me live 💖'
    };
    window.history.pushState({ momentProfile: matched.id }, '');
    setSelectedHostForProfile(matched);
    setActivePhotoIndex(0);
  };

  const handleOpenHostProfileFromStory = (story: Story) => {
    setActiveStoryIndex(null); // Pause story viewer
    const matched = INITIAL_VIDEO_HOSTS.find(h => 
      h.id === story.userId || 
      h.name.toLowerCase().trim() === story.userName.toLowerCase().trim()
    ) || {
      id: story.userId || 'host_story',
      numericId: '1000',
      name: story.userName,
      age: 22,
      avatar: story.userPhoto,
      coverPhoto: story.imageUrl || story.userPhoto,
      photos: [story.userPhoto, story.imageUrl].filter((p): p is string => Boolean(p)),
      bio: 'Moments Host 🌸 | Tap call to connect with me live!',
      status: 'online' as const,
      ratePerMinute: 1500,
      languages: ['Hindi', 'English'],
      tags: ['Online', 'Moments Host'],
      city: 'Mumbai',
      callCount: 350,
      rating: 5.0,
      isVerified: true,
      voiceNoteText: 'Hey sweetheart! Tap call to talk with me live 💖'
    };
    window.history.pushState({ momentProfile: matched.id }, '');
    setSelectedHostForProfile(matched);
    setActivePhotoIndex(0);
  };

  const handleCloseHostProfile = () => {
    setPlayingVoice(false);
    setSelectedHostForProfile(null);
    if (window.history.state?.momentProfile) {
      window.history.back();
    }
  };

  // User gender checking - Only female profiles are permitted to post moments
  const userGender = selfProfile?.gender || (() => {
    try {
      const saved = localStorage.getItem('maxo_custom_profile');
      if (saved) return JSON.parse(saved).gender;
    } catch(e) {}
    return 'male';
  })();
  const isFemale = userGender === 'female';
  
  // Real Firestore States
  const [stories, setStories] = useState<Story[]>([]);
  const [posts, setPosts] = useState<MomentPost[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal control states
  const [showCreationModal, setShowCreationModal] = useState(false);
  const [creationTab, setCreationTab] = useState<'Post' | 'Story'>('Post');
  const [postTitle, setPostTitle] = useState('');
  const [postText, setPostText] = useState('');
  const [postPhoto, setPostPhoto] = useState<string>(''); // Exactly 1 photo per post
  const [postImages, setPostImages] = useState<string[]>([]); // Compatibility
  const [selectedGradient, setSelectedGradient] = useState(PRESET_GRADIENTS[0]);
  const [storyText, setStoryText] = useState('');
  const [storyImage, setStoryImage] = useState('');
  const [storyVideo, setStoryVideo] = useState('');

  // 3-Second Full Screen Gift Animation
  const [activeFullScreenGift, setActiveFullScreenGift] = useState<{
    gift: any;
    hostName: string;
    senderName: string;
  } | null>(null);

  // Active Story viewer states
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [activeStoryProgress, setActiveStoryProgress] = useState(0);

  // Lightbox Modal for Fullscreen Photo Viewing
  const [lightboxData, setLightboxData] = useState<{ images: string[]; index: number } | null>(null);

  // Comments support states
  const [activeCommentPost, setActiveCommentPost] = useState<MomentPost | null>(null);
  const [commentsList, setCommentsList] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');

  // Quick Gift on Moment states
  const [activeGiftPost, setActiveGiftPost] = useState<MomentPost | null>(null);
  const [sendingGiftId, setSendingGiftId] = useState<string | null>(null);

  // Image Compression & Optimization States
  const [compressingState, setCompressingState] = useState<{
    active: boolean;
    progress: number;
    originalSize: string;
    compressedSize: string;
    target: 'Post' | 'Story' | null;
  }>({
    active: false,
    progress: 0,
    originalSize: '',
    compressedSize: '',
    target: null,
  });

  // Listen to browser/phone hardware back button
  useEffect(() => {
    const handlePopState = () => {
      if (selectedHostForProfile) {
        setPlayingVoice(false);
        setSelectedHostForProfile(null);
      }
      if (activeStoryIndex !== null) {
        setActiveStoryIndex(null);
      }
      if (activeCommentPost) {
        setActiveCommentPost(null);
      }
      if (lightboxData) {
        setLightboxData(null);
      }
      if (showCreationModal) {
        setShowCreationModal(false);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedHostForProfile, activeStoryIndex, activeCommentPost, lightboxData, showCreationModal]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = 1;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Compress single file via HTML5 Canvas
  const compressSingleFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const mimeType = file.type || '';
        if (mimeType.includes('gif')) {
          resolve(event.target?.result as string);
          return;
        }
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(event.target?.result as string);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.80);
          resolve(compressed);
        };
        img.onerror = () => reject(new Error("Image initialization failed"));
      };
      reader.onerror = () => reject(new Error("File read error"));
    });
  };

  // High-fidelity image and video optimization (supports up to 6 pictures for posts, 1-minute video for stories)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, target: 'Post' | 'Story' | 'StoryVideo') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (target === 'StoryVideo') {
      const file = files[0];
      if (!file.type.startsWith('video/')) {
        toast.error("Please choose a valid video file (MP4, WebM)");
        return;
      }
      if (file.size > 80 * 1024 * 1024) {
        toast.error("Video size should be under 80MB (up to 1-minute length)");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setStoryVideo(event.target?.result as string);
        setStoryImage('');
        toast.success("1-minute story video ready! 🎥✨");
      };
      reader.readAsDataURL(file);
      return;
    }

    if (target === 'Story') {
      const file = files[0];
      setCompressingState({
        active: true,
        progress: 20,
        originalSize: formatBytes(file.size),
        compressedSize: '',
        target: 'Story'
      });

      try {
        const compressed = await compressSingleFile(file);
        const approxBytes = Math.round((compressed.length - 22) * 3 / 4);
        setStoryImage(compressed);
        setStoryVideo('');
        setCompressingState({
          active: false,
          progress: 100,
          originalSize: formatBytes(file.size),
          compressedSize: formatBytes(approxBytes),
          target: null
        });
        toast.success("Story image ready! ✨");
      } catch (err) {
        setCompressingState(prev => ({ ...prev, active: false }));
        toast.error("Failed to process story image.");
      }
    } else {
      // POST target: Strictly 1 photo per post as specified
      const file = files[0];
      if (!file) return;

      setCompressingState({
        active: true,
        progress: 25,
        originalSize: file.name,
        compressedSize: '',
        target: 'Post'
      });

      try {
        const compressed = await compressSingleFile(file);
        setPostPhoto(compressed);
        setPostImages([compressed]);
        setCompressingState(prev => ({ ...prev, progress: 100 }));
        toast.success("Photo attached successfully! 📸✨");
        
        setTimeout(() => {
          setCompressingState(prev => ({ ...prev, active: false }));
        }, 500);
      } catch (err) {
        setCompressingState(prev => ({ ...prev, active: false }));
        toast.error("Failed to process photo.");
      }
    }
  };

  // Preset image addition for Post (1 photo limit)
  const addPresetToPost = (url: string) => {
    setPostPhoto(url);
    setPostImages([url]);
    toast.success("Background photo selected! 📸");
  };

  // Remove photo from post selection
  const removePostImage = () => {
    setPostPhoto('');
    setPostImages([]);
  };

  // Add Comment Firestore updates
  const handleAddComment = async () => {
    if (!activeCommentPost || !commentText.trim() || !selfProfile) return;
    try {
      const cText = commentText.trim();
      const commentDoc = {
        userId: selfProfile.uid,
        userName: selfProfile.displayName,
        userPhoto: selfProfile.photoURL || getPremiumAvatar(selfProfile.uid),
        text: cText,
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'posts', activeCommentPost.id, 'comments'), commentDoc);
      await updateDoc(doc(db, 'posts', activeCommentPost.id), {
        commentsCount: increment(1)
      });
      setActiveCommentPost(prev => prev ? { ...prev, commentsCount: prev.commentsCount + 1 } : null);
      setCommentText('');
      toast.success("Comment published!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add comment.");
    }
  };

  // Subscribe to raw live stories & posts
  useEffect(() => {
    const qPosts = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(50));
    const unsubPosts = safeOnSnapshot(qPosts, async (snap) => {
      if (snap.empty) {
        setPosts([]);
      } else {
        const list = snap.docs
          .map(doc => {
            const data = doc.data();
            const imgArray = Array.isArray(data.images) ? data.images : (data.image ? [data.image] : []);
            return {
              id: doc.id,
              userId: data.userId || '',
              userName: data.userName || 'Member',
              userPhoto: data.userPhoto || getPremiumAvatar(''),
              content: data.content || '',
              image: data.image || '',
              images: imgArray,
              createdAt: data.createdAt,
              likes: data.likes || [],
              likesCount: data.likesCount || (data.likes ? data.likes.length : 0),
              commentsCount: data.commentsCount || 0,
              timeLabel: data.createdAt ? 'Recently' : 'Just now',
              reactions: data.reactions || { '🔥': [], '❤️': [], '👍': [], '🎉': [] }
            } as MomentPost;
          })
          .filter(p => !p.id.startsWith('p_starter_') && !p.id.startsWith('starter_') && !p.id.startsWith('moment_starter_') && p.userId !== 'anya_test' && p.userId !== 'zara_dj' && p.userId !== 'siddharth_royal');
        setPosts(list);
      }
      setLoading(false);
    }, (err) => {
      console.warn("Offline or failed on snapshot for posts.", err);
      setPosts([]);
      setLoading(false);
    });

    const qStories = query(collection(db, 'stories'));
    const unsubStories = safeOnSnapshot(qStories, (snap) => {
      const now = new Date().getTime();
      const list = snap.docs
        .map(doc => {
          const data = doc.data();
          return { id: doc.id, ...data } as Story;
        })
        .filter(s => {
          const expiryTime = new Date(s.expiresAt).getTime();
          return expiryTime > now && !s.id.startsWith('starter_') && !s.id.startsWith('story_starter_') && s.userId !== 'anya_test' && s.userId !== 'zara_dj';
        });

      setStories(list);
    }, (err) => {
      console.warn("Failed stories snap", err);
      setStories([]);
    });

    return () => {
      unsubPosts();
      unsubStories();
    };
  }, []);

  // Comments live database query listener
  useEffect(() => {
    if (!activeCommentPost) {
      setCommentsList([]);
      return;
    }
    const q = query(
      collection(db, 'posts', activeCommentPost.id, 'comments'),
      orderBy('createdAt', 'asc')
    );
    const unsub = safeOnSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCommentsList(list);
    }, (err) => {
      console.warn("Offline comments load backup", err);
    });
    return unsub;
  }, [activeCommentPost]);

  // Story Viewer Auto-Next & progress timer
  useEffect(() => {
    if (activeStoryIndex === null) return;
    setActiveStoryProgress(0);

    const interval = setInterval(() => {
      setActiveStoryProgress(prev => {
        if (prev >= 100) {
          if (activeStoryIndex < stories.length - 1) {
            setActiveStoryIndex(activeStoryIndex + 1);
          } else {
            setActiveStoryIndex(null);
          }
          return 0;
        }
        return prev + 1.25;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [activeStoryIndex, stories]);

  // Create real Moment Post (title + message + strictly 1 photo)
  const handleCreatePost = async () => {
    if (!selfProfile) return;
    if (!isFemale) {
      toast.error("Posting is reserved for female host profiles. Male profiles can browse, like & comment!");
      setShowCreationModal(false);
      return;
    }
    if (!postTitle.trim() && !postText.trim() && !postPhoto) {
      toast.error("Please add a title, message, or photo to your moment!");
      return;
    }

    try {
      const newPost = {
        userId: selfProfile.uid,
        authorId: selfProfile.uid,
        userName: selfProfile.displayName,
        userPhoto: selfProfile.photoURL || getPremiumAvatar(selfProfile.uid),
        title: postTitle.trim().slice(0, 120),
        content: postText.slice(0, 1000),
        image: postPhoto || '',
        images: postPhoto ? [postPhoto] : [],
        likes: [],
        likesCount: 0,
        commentsCount: 0,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'posts'), newPost);
      toast.success("Moment published successfully! 📸✨");
      
      // Clear forms
      setPostTitle('');
      setPostText('');
      setPostPhoto('');
      setPostImages([]);
      setShowCreationModal(false);
    } catch (e) {
      console.error(e);
      toast.error("Offline write queued. Try again later.");
    }
  };

  // Create real Story (with 24h expiration, supports 1-minute video or photo)
  const handleCreateStory = async () => {
    if (!selfProfile) return;
    if (!isFemale) {
      toast.error("Story creation is reserved for female host profiles.");
      setShowCreationModal(false);
      return;
    }
    if (!storyText.trim() && !storyImage && !storyVideo) {
      toast.error("Your story needs a video, picture or words!");
      return;
    }

    try {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const newStory: any = {
        userId: selfProfile.uid,
        authorId: selfProfile.uid,
        userName: selfProfile.displayName,
        userPhoto: selfProfile.photoURL || getPremiumAvatar(selfProfile.uid),
        imageUrl: storyImage || '',
        videoUrl: storyVideo || '',
        mediaType: storyVideo ? 'video' : storyImage ? 'image' : 'text',
        bgColorClass: (storyImage || storyVideo) ? '' : selectedGradient,
        text: storyText || '',
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt,
        reactions: { '💖': 0, '🔥': 0, '🎉': 0, '😂': 0 }
      };

      await addDoc(collection(db, 'stories'), newStory);
      toast.success(storyVideo ? "1-Minute Story Video published for 24 Hours! 🌟🎥" : "Story published for 24 Hours! 🌟📸");
      
      setStoryText('');
      setStoryImage('');
      setStoryVideo('');
      setShowCreationModal(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to publish story");
    }
  };

  // Send Gift to Moment Host with instant coin deduction
  const handleSendMomentGift = async (post: MomentPost, gift: QuickGift) => {
    if (!selfProfile) {
      toast.error("Please login to send gifts");
      return;
    }
    const currentCoins = selfProfile.coins || 0;
    if (currentCoins < gift.coins) {
      toast.error(`Insufficient coins (${currentCoins.toLocaleString()} 🪙). You need ${gift.coins.toLocaleString()} coins.`);
      return;
    }

    setSendingGiftId(gift.id);
    try {
      const userRef = doc(db, 'users', selfProfile.uid);
      await updateDoc(userRef, {
        coins: increment(-gift.coins)
      });
      if (selfProfile) {
        selfProfile.coins = Math.max(0, currentCoins - gift.coins);
      }

      // Add special gift comment to the Moment
      const giftComment = {
        userId: selfProfile.uid,
        userName: selfProfile.displayName || 'Fan',
        userPhoto: selfProfile.photoURL || getPremiumAvatar(selfProfile.uid),
        text: `🎁 Sent ${gift.name} (${gift.icon} ${gift.coins} Coins) to ${post.userName}!`,
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'posts', post.id, 'comments'), giftComment);
      await updateDoc(doc(db, 'posts', post.id), {
        commentsCount: increment(1)
      });

      // Trigger 3-second full-screen gift animation
      setActiveFullScreenGift({
        gift: {
          name: gift.name,
          hindiName: gift.name,
          cost: gift.coins,
          icon: gift.icon,
          themeColor: '#ec4899',
          tagline: `Sent ${gift.icon} ${gift.name} to ${post.userName}!`
        },
        hostName: post.userName,
        senderName: selfProfile.displayName || 'Fan'
      });
      setTimeout(() => {
        setActiveFullScreenGift(null);
      }, 3000);

      toast.success(`🎉 You sent ${gift.icon} ${gift.name} to ${post.userName}! 💖`);
      setActiveGiftPost(null);
    } catch (e) {
      console.error(e);
      toast.success(`🎁 Sent ${gift.icon} ${gift.name} to ${post.userName}!`);
      setActiveGiftPost(null);
    } finally {
      setSendingGiftId(null);
    }
  };

  // Like / React to Moments with Firestore write
  const handleLikePost = async (post: MomentPost) => {
    if (!selfProfile) return;
    const postRef = doc(db, 'posts', post.id);
    const hasLiked = post.likes.includes(selfProfile.uid);
    let updatedLikes = [];

    if (hasLiked) {
      updatedLikes = post.likes.filter(id => id !== selfProfile.uid);
    } else {
      updatedLikes = [...post.likes, selfProfile.uid];
    }

    try {
      await updateDoc(postRef, {
        likes: updatedLikes,
        likesCount: updatedLikes.length
      });
    } catch (err) {
      setPosts(prev => prev.map(p => {
        if (p.id === post.id) {
          return {
            ...p,
            likes: updatedLikes,
            likesCount: updatedLikes.length
          };
        }
        return p;
      }));
    }
  };

  // Delete self Moments Post (Strictly females only - males can never delete)
  const handleDeletePost = async (post: MomentPost) => {
    if (!isFemale) {
      toast.error('Only female hosts can delete moment posts. View only for users.');
      return;
    }
    if (!selfProfile || post.userId !== selfProfile.uid) return;
    try {
      await deleteDoc(doc(db, 'posts', post.id));
      toast.success("Moment deleted successfully ✅");
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  // Delete Story (Strictly females only)
  const handleDeleteStory = async (story: Story) => {
    if (!isFemale) {
      toast.error('Only female hosts can delete stories.');
      return;
    }
    if (!selfProfile || story.userId !== selfProfile.uid) return;
    try {
      await deleteDoc(doc(db, 'stories', story.id));
      toast.success("Story removed ✅");
      setActiveStoryIndex(null);
    } catch (err) {
      toast.error("Could not delete");
    }
  };

  // React on Story
  const handleReactStory = async (story: Story, emoji: string) => {
    try {
      const storyRef = doc(db, 'stories', story.id);
      const prevVal = story.reactions?.[emoji] || 0;
      await updateDoc(storyRef, {
        [`reactions.${emoji}`]: prevVal + 1
      });
      toast.info(`Sent ${emoji} to ${story.userName}!`);
    } catch (err) {
      console.warn("Offline reaction simulation");
    }
  };

  function getStarterStories(): Story[] {
    return [];
  }

  function getStarterPosts(): MomentPost[] {
    return [];
  }

  return (
    <div className="bg-[#07050F] min-h-screen pb-24 text-white relative overflow-hidden font-sans">
      {/* Soft Light Pink Atmospheric Glows */}
      <div className="absolute top-0 left-0 right-0 h-80 bg-gradient-to-b from-pink-300/15 via-pink-200/5 to-transparent pointer-events-none" />
      <div className="absolute top-10 left-[-40px] w-72 h-72 bg-pink-300/10 rounded-full blur-[110px] pointer-events-none" />

      {/* Header */}
      <header className="flex justify-between items-center px-4 pt-3 pb-3 border-b border-white/[0.08] sticky top-0 bg-[#07050F]/90 backdrop-blur-xl z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-pink-300 via-rose-200 to-pink-200 p-0.5 shadow-[0_0_12px_rgba(244,114,182,0.3)]">
            <div className="w-full h-full bg-[#0E091D] rounded-[14px] flex items-center justify-center">
              <Sparkles className="text-pink-300 animate-pulse" size={16} />
            </div>
          </div>
          <div>
            <h2 className="text-sm font-black tracking-wider text-white uppercase flex items-center gap-1.5">
              <span>MOMENTS</span>
              <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-pink-300/15 text-pink-200 border border-pink-300/30">
                HOT FEED
              </span>
            </h2>
            <p className="text-[9.5px] text-zinc-400 font-medium mt-0.5">Share Photos & Vibes with Hosts</p>
          </div>
        </div>

        {isFemale && (
          <button 
            onClick={() => setShowCreationModal(true)}
            className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-pink-400 via-rose-300 to-pink-300 flex items-center gap-1 text-zinc-950 text-xs font-black shadow-lg shadow-pink-300/20 active:scale-95 transition-transform cursor-pointer hover:brightness-110"
          >
            <Plus size={14} className="stroke-[3] text-zinc-950" />
            <span>Share Moment ✨</span>
          </button>
        )}
      </header>

      {/* Moments Feed */}
      <main className="px-3 py-3 space-y-3 max-w-lg mx-auto">
        {posts.length === 0 && !loading && (
          <div className="text-center py-16 px-4 bg-[#110B22]/60 rounded-3xl border border-pink-300/15 flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-300/15 to-indigo-500/10 border border-pink-300/20 flex items-center justify-center text-2xl mb-3">
              📸
            </div>
            <h3 className="text-sm font-black text-white mb-1">No Moments Available</h3>
            <p className="text-xs text-gray-400 max-w-xs">New moments and photos from hosts will appear here soon.</p>
          </div>
        )}

        {posts.map((post) => {
          const hasLiked = post.likes.includes(selfProfile?.uid || '');
          const imagesList: string[] = post.images && post.images.length > 0 
            ? post.images 
            : (post.image ? [post.image] : []);

          return (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={post.id} 
              className="bg-[#110B22]/85 border border-pink-300/15 hover:border-pink-300/40 p-4 rounded-3xl flex flex-col gap-3.5 shadow-xl transition-all"
            >
              {/* Post Header - Tap host avatar or name to open full profile */}
              <div className="flex items-center justify-between">
                <div 
                  onClick={() => handleOpenHostProfileFromMoment(post)}
                  className="flex items-center gap-2.5 cursor-pointer group"
                  title="View host profile"
                >
                  <div className="relative p-0.5 rounded-full bg-gradient-to-tr from-pink-500 via-rose-400 to-purple-500 shadow-sm group-hover:scale-105 transition-transform">
                     <Avatar className="w-10 h-10 border border-white/20">
                       <AvatarImage src={post.userPhoto} className="object-cover" />
                       <AvatarFallback className="bg-zinc-800 font-bold text-xs">{post.userName?.[0] || '?'}</AvatarFallback>
                     </Avatar>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-xs font-black text-white group-hover:text-pink-300 transition-colors">{post.userName}</h4>
                      <Badge className="bg-pink-500/20 text-pink-300 text-[8px] font-black px-1.5 h-3.5 rounded uppercase border border-pink-500/30 flex items-center gap-0.5">
                        <ShieldCheck size={10} className="text-pink-400" />
                        <span>HOST</span>
                      </Badge>
                    </div>
                    <p className="text-[9px] text-pink-300/80 font-bold uppercase mt-0.5">{post.timeLabel}</p>
                  </div>
                </div>

                {isFemale && selfProfile && post.userId === selfProfile.uid && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDeletePost(post)}
                    className="text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-full w-7 h-7"
                    title="Delete Moment"
                  >
                    <Trash2 size={13} />
                  </Button>
                )}
              </div>

              {/* Title & Message Content */}
              {post.title && (
                <h4 className="text-sm font-black text-white px-0.5 tracking-tight leading-snug">
                  {post.title}
                </h4>
              )}

              {post.content && (
                <p className="text-xs text-gray-200 leading-relaxed font-medium px-0.5">
                  {post.content}
                </p>
              )}

              {/* Single Photo Display with Tap to Zoom */}
              {(post.image || imagesList.length > 0) && (
                <div className="rounded-2xl overflow-hidden border border-white/10 shadow-lg bg-black/40">
                  <div 
                    onClick={() => setLightboxData({ images: [post.image || imagesList[0]], index: 0 })}
                    className="relative aspect-[16/10] overflow-hidden cursor-pointer group"
                  >
                    <img 
                      src={post.image || imagesList[0]} 
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500" 
                      alt={post.title || "Moment"} 
                    />
                    <div className="absolute bottom-2.5 right-2.5 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-[9px] font-black border border-white/15 flex items-center gap-1 shadow-md">
                      <Sparkles size={10} className="text-pink-400" /> Full Photo
                    </div>
                  </div>
                </div>
              )}

              {/* Interactive Feed Bar */}
              <div className="flex items-center justify-between pt-2.5 border-t border-white/5">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => handleLikePost(post)}
                    className="flex items-center gap-1.5 cursor-pointer active:scale-90 transition-transform"
                  >
                     <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                       hasLiked 
                         ? 'bg-red-500/20 text-red-400' 
                         : 'bg-white/5 text-gray-400 hover:text-red-400'
                     }`}>
                        <Heart size={14} fill={hasLiked ? "currentColor" : "none"} />
                     </div>
                     <span className={`text-[10px] font-bold ${hasLiked ? 'text-red-400' : 'text-gray-400'}`}>{post.likesCount}</span>
                  </button>

                  <button 
                    onClick={() => setActiveCommentPost(post)}
                    className="flex items-center gap-1.5 cursor-pointer active:scale-90 transition-transform"
                  >
                     <div className="w-7 h-7 rounded-full bg-white/5 text-gray-400 hover:text-blue-400 flex items-center justify-center transition-all">
                        <MessageSquare size={14} />
                     </div>
                     <span className="text-[10px] font-bold text-gray-400">{post.commentsCount}</span>
                  </button>

                  {/* Send Gift Button */}
                  <button
                    onClick={() => setActiveGiftPost(post)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/10 text-amber-300 hover:text-amber-200 border border-amber-500/40 active:scale-95 transition-all text-[11px] font-black cursor-pointer shadow-sm"
                  >
                    <Gift size={13} className="text-amber-400" />
                    <span>Send Gift 🎁</span>
                  </button>
                </div>

                <div className="flex gap-1 items-center bg-black/30 px-2 py-0.5 rounded-full border border-white/5">
                  {['🔥', '❤️', '👍'].map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => handleLikePost(post)}
                      className="text-xs hover:scale-120 active:scale-90 transition-transform"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          );
        })}
      </main>

      {/* FULLSCREEN LIGHTBOX PHOTO VIEWER */}
      {lightboxData && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-between p-3"
          onClick={() => setLightboxData(null)}
        >
          <div className="w-full flex items-center justify-between z-10" onClick={e => e.stopPropagation()}>
            <span className="text-xs font-black text-white px-3 py-1 rounded-full bg-white/10 border border-white/10">
              {lightboxData.index + 1} / {lightboxData.images.length}
            </span>
            <button 
              onClick={() => setLightboxData(null)}
              className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="relative flex-1 w-full max-w-md flex items-center justify-center my-auto" onClick={e => e.stopPropagation()}>
            <img 
              src={lightboxData.images[lightboxData.index]} 
              className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-2xl" 
              alt="Expanded view" 
            />

            {lightboxData.images.length > 1 && (
              <>
                <button 
                  onClick={() => setLightboxData(prev => prev ? { ...prev, index: (prev.index - 1 + prev.images.length) % prev.images.length } : null)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center border border-white/20 transition-all"
                >
                  <ChevronLeft size={18} />
                </button>
                <button 
                  onClick={() => setLightboxData(prev => prev ? { ...prev, index: (prev.index + 1) % prev.images.length } : null)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center border border-white/20 transition-all"
                >
                  <ChevronRight size={18} />
                </button>
              </>
            )}
          </div>

          {lightboxData.images.length > 1 && (
            <div className="flex gap-1.5 p-1 overflow-x-auto max-w-full z-10" onClick={e => e.stopPropagation()}>
              {lightboxData.images.map((img, idx) => (
                <button 
                  key={idx}
                  onClick={() => setLightboxData(prev => prev ? { ...prev, index: idx } : null)}
                  className={`w-10 h-10 rounded-md overflow-hidden border-2 shrink-0 ${lightboxData.index === idx ? 'border-pink-500 scale-105' : 'border-white/20 opacity-60'}`}
                >
                  <img src={img} className="w-full h-full object-cover" alt={`thumb ${idx}`} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STORY EXPANDED VIEWER MODAL */}
      <AnimatePresence>
        {activeStoryIndex !== null && stories[activeStoryIndex] && (
          <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between p-3 pb-8">
            <div className="w-full bg-white/20 h-1 rounded-full overflow-hidden flex gap-1 mb-2">
              {stories.map((_, i) => (
                <div key={i} className="flex-1 bg-white/20 h-full rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white transition-all duration-100" 
                    style={{ 
                      width: i < activeStoryIndex ? '100%' : i === activeStoryIndex ? `${activeStoryProgress}%` : '0%' 
                    }} 
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between z-10 px-2">
              <div 
                onClick={() => handleOpenHostProfileFromStory(stories[activeStoryIndex])}
                className="flex items-center gap-2 cursor-pointer hover:opacity-90 active:scale-95 transition-all"
                title="View host profile (होस्ट प्रोफ़ाइल देखें)"
              >
                <Avatar className="w-9 h-9 border-2 border-pink-400 shadow-md">
                  <AvatarImage src={stories[activeStoryIndex].userPhoto} className="object-cover" />
                  <AvatarFallback className="bg-zinc-800 text-xs font-bold">{stories[activeStoryIndex].userName?.[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="text-xs font-black text-white flex items-center gap-1">
                    <span>{stories[activeStoryIndex].userName}</span>
                    <ShieldCheck size={12} className="text-pink-400 fill-pink-400/20" />
                  </h4>
                  <span className="text-[8px] text-pink-300 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>View Host Profile • 24h Status</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isFemale && selfProfile && stories[activeStoryIndex].userId === selfProfile.uid && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDeleteStory(stories[activeStoryIndex])}
                    className="text-white/80 hover:text-red-400 rounded-full w-7 h-7"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </Button>
                )}
                <button 
                  onClick={() => setActiveStoryIndex(null)}
                  className="w-7 h-7 rounded-full bg-black/40 border border-white/20 flex items-center justify-center text-white"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="relative flex-1 my-3 rounded-2xl overflow-hidden flex items-center justify-center bg-black/95 p-1">
              {stories[activeStoryIndex].videoUrl || stories[activeStoryIndex].mediaType === 'video' || stories[activeStoryIndex].imageUrl?.includes('.mp4') || stories[activeStoryIndex].imageUrl?.includes('.webm') ? (
                <video 
                  src={stories[activeStoryIndex].videoUrl || stories[activeStoryIndex].imageUrl} 
                  autoPlay 
                  playsInline 
                  controls
                  className="max-h-[78vh] max-w-full w-auto h-auto object-contain rounded-xl shadow-2xl mx-auto" 
                />
              ) : stories[activeStoryIndex].imageUrl ? (
                <img 
                  src={stories[activeStoryIndex].imageUrl} 
                  className="max-h-[78vh] max-w-full w-auto h-auto object-contain rounded-xl shadow-2xl mx-auto" 
                  alt="Story Content" 
                />
              ) : (
                <div className={`w-full h-full bg-gradient-to-tr ${stories[activeStoryIndex].bgColorClass || PRESET_GRADIENTS[0]} flex items-center justify-center p-6 text-center rounded-xl`}>
                  <p className="text-lg font-black text-white tracking-wide shadow-black drop-shadow-md">
                    {stories[activeStoryIndex].text}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-around gap-2 px-2 z-10">
              {['💖', '🔥', '🎉', '😂'].map(emoji => (
                <button 
                  key={emoji}
                  onClick={() => handleReactStory(stories[activeStoryIndex], emoji)}
                  className="w-10 h-10 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-lg active:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE MODAL (POSTS UP TO 6 PICS / STORIES) - Only accessible by female profiles */}
      <AnimatePresence>
        {showCreationModal && isFemale && (
          <div className="fixed inset-0 bg-[#0C101A]/85 backdrop-blur-md z-50 flex items-center justify-center p-3">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#121624] border border-white/10 rounded-3xl w-full max-w-md p-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center font-bold text-xs">
                    <Sparkles size={14} />
                  </div>
                  <h3 className="text-sm font-black text-white">Create New Moment</h3>
                </div>

                <button 
                  onClick={() => setShowCreationModal(false)}
                  className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/80 hover:bg-white/10"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="space-y-3">
                {/* Title Input */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                    Title
                  </label>
                  <Input
                    value={postTitle}
                    onChange={e => setPostTitle(e.target.value)}
                    maxLength={100}
                    placeholder="Enter moment title (e.g., Live from Studio ✨)..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold placeholder:text-gray-500 focus:border-pink-500 text-white"
                  />
                </div>

                {/* Message Textarea */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                    Message
                  </label>
                  <textarea 
                    value={postText}
                    onChange={e => setPostText(e.target.value)}
                    rows={3}
                    maxLength={1000}
                    placeholder="What's on your mind? Share your message with followers..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs font-medium placeholder:text-gray-500 focus:outline-none focus:border-pink-500 text-white resize-none"
                  />
                </div>

                {/* Single Photo Selection / Preview */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Attached Photo (1 Photo Max)
                    </label>
                    {postPhoto && (
                      <span className="text-[9px] font-bold text-pink-400">1 Photo Selected</span>
                    )}
                  </div>

                  {postPhoto ? (
                    <div className="relative aspect-[16/9] rounded-xl overflow-hidden border border-pink-400/40 group shadow-md">
                      <img src={postPhoto} className="w-full h-full object-cover" alt="Selected moment" />
                      <button
                        type="button"
                        onClick={removePostImage}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/80 hover:bg-red-500 text-white flex items-center justify-center transition-colors shadow-md"
                        title="Remove photo"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="border border-dashed border-white/15 rounded-xl p-4 bg-white/5 hover:bg-white/10 transition-all text-center">
                        {compressingState.active && compressingState.target === 'Post' ? (
                          <div className="py-2 space-y-1">
                            <p className="text-[10px] font-bold text-pink-400 animate-pulse">Processing photo...</p>
                            <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-pink-500 to-[#FF8A96]" style={{ width: `${compressingState.progress}%` }} />
                            </div>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center cursor-pointer py-1">
                            <ImageIcon size={24} className="text-pink-400 mb-1" />
                            <span className="text-xs font-bold text-white">Select Photo from Gallery</span>
                            <span className="text-[9px] text-gray-400 mt-0.5">Attach 1 high-quality photo (JPG, PNG)</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleFileChange(e, 'Post')}
                            />
                          </label>
                        )}
                      </div>

                      {/* Preset Background options */}
                      <div className="space-y-1">
                        <span className="text-[8.5px] uppercase font-bold text-gray-400 block">Or Choose Preset Background</span>
                        <div className="grid grid-cols-4 gap-1.5">
                          {momentPresets.map(preset => (
                            <div 
                              key={preset.url}
                              onClick={() => addPresetToPost(preset.url)}
                              className="aspect-video rounded-lg overflow-hidden cursor-pointer border border-white/5 hover:border-pink-400 relative group"
                            >
                              <img src={preset.url} className="w-full h-full object-cover" alt="preset" />
                              <div className="absolute inset-x-0 bottom-0 bg-black/70 text-[7px] text-center font-bold py-0.5 truncate text-white">{preset.name}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Button 
                  onClick={handleCreatePost}
                  className="w-full h-10 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 text-white font-black uppercase text-xs shadow-lg shadow-pink-500/20 active:scale-98"
                >
                  Publish Moment ✨
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QUICK GIFT MODAL ON MOMENTS */}
      <AnimatePresence>
        {activeGiftPost && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-end justify-center">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-[#101428] border-t border-amber-500/30 rounded-t-3xl w-full max-w-md p-5 pb-8 flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-500 flex items-center justify-center text-black font-black shadow-md">
                    <Gift size={18} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-white">Send Gift to {activeGiftPost.userName}</h3>
                    <p className="text-[9px] text-amber-300 font-bold">HOST ID: {activeGiftPost.userId.replace('host_', '').slice(0, 8).toUpperCase()}</p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveGiftPost(null)}
                  className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/80 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>

              {/* User Balance */}
              <div className="flex items-center justify-between px-3.5 py-2 my-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                <span className="text-xs text-amber-200 font-bold flex items-center gap-1.5">
                  <Coins size={14} className="text-amber-400" />
                  <span>Your Coin Balance:</span>
                </span>
                <span className="text-xs font-black text-amber-300 font-mono">
                  {(selfProfile?.coins || 0).toLocaleString()} 🪙
                </span>
              </div>

              {/* Gifts Grid */}
              <div className="grid grid-cols-5 gap-2 my-2">
                {QUICK_MOMENT_GIFTS.map(gift => (
                  <button
                    key={gift.id}
                    disabled={sendingGiftId === gift.id}
                    onClick={() => handleSendMomentGift(activeGiftPost, gift)}
                    className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white/[0.04] hover:bg-amber-500/20 border border-white/5 hover:border-amber-400/40 transition-all active:scale-90 text-center group cursor-pointer"
                  >
                    <span className="text-2xl group-hover:scale-125 transition-transform">{gift.icon}</span>
                    <span className="text-[10px] font-bold text-white mt-1">{gift.name}</span>
                    <span className="text-[9px] font-black text-amber-400 mt-0.5">{gift.coins} 🪙</span>
                  </button>
                ))}
              </div>

              <p className="text-[9.5px] text-center text-zinc-400 mt-2 font-medium">
                Gifting motivates your favorite host & increases your intimacy score! 💖
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* COMMENTS DRAWER */}
      <AnimatePresence>
        {activeCommentPost && (
          <div className="fixed inset-0 bg-[#0C101A]/85 backdrop-blur-md z-50 flex items-end justify-center">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-[#121624] border-t border-white/10 rounded-t-3xl w-full max-w-md p-4 pb-8 flex flex-col max-h-[75vh]"
            >
              <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/5">
                <div>
                  <h3 className="text-xs font-black text-white">Comments</h3>
                  <p className="text-[8px] text-[#FF4D67] font-bold">DISCUSSIONS ({activeCommentPost.commentsCount})</p>
                </div>
                <button
                  onClick={() => setActiveCommentPost(null)}
                  className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/80"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 min-h-[140px] max-h-[35vh] no-scrollbar">
                {commentsList.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-xs font-medium">
                    Be the first to comment! ✨
                  </div>
                ) : (
                  commentsList.map((c) => (
                    <div key={c.id} className="flex gap-2.5 items-start">
                      <Avatar className="w-7 h-7">
                        <AvatarImage src={c.userPhoto} className="object-cover" />
                        <AvatarFallback className="bg-zinc-800 font-bold text-[10px]">{c.userName?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 bg-white/5 rounded-xl p-2.5 border border-white/5">
                        <span className="text-[10px] font-black text-gray-300 block mb-0.5">{c.userName}</span>
                        <p className="text-xs text-gray-200">{c.text}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-white/5 flex gap-2">
                <Input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment..."
                  className="bg-white/5 border-white/10 rounded-xl text-xs placeholder:text-gray-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddComment();
                  }}
                />
                <Button
                  onClick={handleAddComment}
                  disabled={!commentText.trim()}
                  className="bg-[#FF4D67] hover:bg-[#FF8A96] text-white rounded-xl text-xs font-bold px-3 shrink-0"
                >
                  Send
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FULL SCREEN GIFT ANIMATION FOR 3 SECONDS */}
      {activeFullScreenGift && (
        <FullScreenGiftAnimation
          gift={activeFullScreenGift.gift}
          hostName={activeFullScreenGift.hostName}
          senderName={activeFullScreenGift.senderName}
          onComplete={() => setActiveFullScreenGift(null)}
        />
      )}

      {/* FULL-SCREEN HOST PROFILE MODAL (Tapped from Moments) */}
      <AnimatePresence>
        {selectedHostForProfile && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0 }}
            className="fixed inset-0 z-50 bg-[#0A0718] flex flex-col overflow-hidden"
          >
            {/* Top Navigation Bar with Back Button */}
            <header className="sticky top-0 z-30 px-4 py-3 bg-[#07050F]/95 backdrop-blur-xl border-b border-white/10 flex items-center justify-between">
              {/* Back Button */}
              <button
                type="button"
                onClick={handleCloseHostProfile}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-zinc-200 hover:text-white transition-all cursor-pointer active:scale-90 border border-white/10 shrink-0"
              >
                <ChevronLeft size={19} />
                <span className="text-xs font-black tracking-wide">Back</span>
              </button>

              {/* Host Center Info */}
              <div className="flex items-center gap-1.5 flex-1 min-w-0 mx-2 justify-center">
                <h3 className="font-black text-white text-base sm:text-lg flex items-center gap-1.5 truncate">
                  <span className="truncate">{selectedHostForProfile.name}</span>
                  {selectedHostForProfile.isVerified && (
                    <ShieldCheck size={18} className="text-pink-400 fill-pink-400/20 shrink-0" />
                  )}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shrink-0 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Online
                </span>
              </div>

              {/* Permanent Host ID Pill with Copy & Close */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const idVal = selectedHostForProfile.numericId || '1000';
                    navigator.clipboard?.writeText(idVal);
                    toast.success(`Host ID #${idVal} Copied! 📋`);
                  }}
                  className="px-2.5 py-1 rounded-full bg-pink-500/20 border border-pink-500/40 text-pink-300 text-[11px] font-black font-mono flex items-center gap-1 hover:bg-pink-500/30 transition-all cursor-pointer shadow-sm active:scale-95"
                  title="Copy Host ID"
                >
                  <span>ID: {selectedHostForProfile.numericId || '1000'}</span>
                  <Copy size={11} className="text-pink-400" />
                </button>

                <button
                  type="button"
                  onClick={handleCloseHostProfile}
                  className="p-1.5 rounded-full bg-white/10 text-zinc-300 hover:text-white hover:bg-white/20 transition-all cursor-pointer"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </header>

            {/* Scrollable Profile Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-4 flex flex-col gap-4 pb-28">
              {/* Photo Gallery with Thumbnails */}
              {(() => {
                const gallery = selectedHostForProfile.photos && selectedHostForProfile.photos.length > 0
                  ? selectedHostForProfile.photos
                  : [selectedHostForProfile.avatar, selectedHostForProfile.coverPhoto];
                const currentPhoto = gallery[activePhotoIndex] || gallery[0];

                return (
                  <div className="flex flex-col gap-2.5">
                    <div className="relative aspect-[4/5] sm:aspect-[16/10] max-h-[50vh] w-full rounded-3xl overflow-hidden bg-black shadow-2xl border border-white/10 group">
                      <img
                        key={currentPhoto}
                        src={currentPhoto}
                        alt={`${selectedHostForProfile.name} photo`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#07050F] via-transparent to-black/40 pointer-events-none" />

                      <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-xs font-black text-white border border-white/20 flex items-center gap-1.5 shadow">
                        <Sparkles size={12} className="text-pink-400" />
                        <span>Photo {activePhotoIndex + 1} / {gallery.length}</span>
                      </div>

                      <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-emerald-500/80 backdrop-blur-md text-[11px] font-black text-white border border-white/20 shadow flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        ONLINE
                      </div>

                      {/* Prominent Host Name & Identity Overlay at Bottom of Photo */}
                      <div className="absolute bottom-0 inset-x-0 p-4 pt-10 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex flex-col gap-1 pointer-events-none z-10">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-2xl font-black text-white tracking-tight drop-shadow-md flex items-center gap-1.5">
                            <span>{selectedHostForProfile.name}</span>
                            {selectedHostForProfile.isVerified && (
                              <ShieldCheck size={22} className="text-pink-400 fill-pink-400/20 shrink-0" />
                            )}
                          </h2>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/30 text-emerald-300 border border-emerald-400/50 shadow flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            ऑनलाइन (Online)
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-200 font-bold flex-wrap">
                          <span className="text-pink-300">📍 {selectedHostForProfile.city}</span>
                          <span className="text-zinc-400">•</span>
                          <span>{selectedHostForProfile.age} साल (Years)</span>
                          <span className="text-zinc-400">•</span>
                          <span className="bg-pink-500/25 px-2 py-0.5 rounded-full text-[11px] text-pink-200 font-mono font-black border border-pink-500/40">
                            ID: #{selectedHostForProfile.numericId || '1000'}
                          </span>
                        </div>
                      </div>

                      {gallery.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActivePhotoIndex(prev => (prev === 0 ? gallery.length - 1 : prev - 1));
                            }}
                            className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-all border border-white/20 active:scale-90 cursor-pointer shadow-xl"
                          >
                            <ChevronLeft size={20} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActivePhotoIndex(prev => (prev === gallery.length - 1 ? 0 : prev + 1));
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-all border border-white/20 active:scale-90 cursor-pointer shadow-xl"
                          >
                            <ChevronRight size={20} />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Thumbnails */}
                    <div className="grid grid-cols-6 gap-2">
                      {gallery.map((p, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActivePhotoIndex(idx)}
                          className={`aspect-square rounded-2xl overflow-hidden border-2 transition-all cursor-pointer relative ${
                            activePhotoIndex === idx
                              ? 'border-pink-500 ring-2 ring-pink-500/50 scale-105 shadow-md'
                              : 'border-white/15 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img src={p} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* 2B. PROMINENT HOST NAME & IDENTITY BANNER */}
              <div className="bg-gradient-to-r from-[#170E30] via-[#1A1238] to-[#120B24] border border-pink-500/30 rounded-3xl p-4 flex items-center justify-between shadow-xl">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-1.5">
                      <span className="truncate">{selectedHostForProfile.name}</span>
                      {selectedHostForProfile.isVerified && (
                        <ShieldCheck size={20} className="text-pink-400 fill-pink-400/20 shrink-0" />
                      )}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Online
                    </span>
                  </div>
                  <div className="text-xs text-zinc-300 mt-1 flex items-center gap-2 flex-wrap font-medium">
                    <span className="text-pink-300 font-bold">📍 {selectedHostForProfile.city}</span>
                    <span className="text-zinc-500">•</span>
                    <span>{selectedHostForProfile.age} yrs</span>
                    <span className="text-zinc-500">•</span>
                    <button
                      type="button"
                      onClick={() => {
                        const idVal = selectedHostForProfile.numericId || '1000';
                        navigator.clipboard?.writeText(idVal);
                        toast.success(`Host ID #${idVal} Copied! 📋`);
                      }}
                      className="bg-white/10 hover:bg-white/20 active:scale-95 px-2.5 py-0.5 rounded-full text-[10px] text-pink-200 font-mono font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                      title="Click to copy ID"
                    >
                      <span>ID: #{selectedHostForProfile.numericId || '1000'}</span>
                      <Copy size={10} className="text-pink-300" />
                    </button>
                  </div>
                </div>

                <div className="shrink-0 text-right pl-3">
                  <div className="text-[10px] text-zinc-400 font-bold uppercase">Call Rate</div>
                  <div className="text-amber-300 font-black text-sm flex items-center gap-1">
                    <Coins size={14} className="text-amber-400" />
                    <span>{selectedHostForProfile.ratePerMinute.toLocaleString()}🪙/m</span>
                  </div>
                </div>
              </div>

              {/* Host Voice Note Card */}
              <div className="bg-gradient-to-r from-[#170E30] to-[#120B24] border border-pink-500/30 rounded-3xl p-4 flex items-center justify-between shadow-xl">
                <div className="flex items-center gap-3.5">
                  <button
                    type="button"
                    onClick={() => setPlayingVoice(!playingVoice)}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg active:scale-90 cursor-pointer ${
                      playingVoice
                        ? 'bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-400 text-white animate-pulse'
                        : 'bg-white/10 hover:bg-white/20 text-pink-300 border border-white/15'
                    }`}
                  >
                    {playingVoice ? <VolumeX size={22} /> : <Volume2 size={22} />}
                  </button>
                  <div>
                    <p className="text-xs font-black text-white">
                      {playingVoice ? 'Playing Voice...' : 'Listen to Host Voice 🎙️'}
                    </p>
                    <p className="text-[11px] text-zinc-300 italic mt-0.5 line-clamp-1">
                      "{selectedHostForProfile.voiceNoteText || 'Hey handsome! Connect with me on video call'}"
                    </p>
                  </div>
                </div>
              </div>

              {/* Bio & Tags */}
              <div className="bg-[#150D2B] rounded-3xl p-4 border border-white/5 flex flex-col gap-2.5 shadow-md">
                <span className="text-xs font-black text-zinc-300">About Host:</span>
                <p className="text-xs text-zinc-200 leading-relaxed font-medium">
                  {selectedHostForProfile.bio}
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(selectedHostForProfile.tags || []).map((tag, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-full bg-pink-500/15 text-pink-300 text-[10px] font-bold border border-pink-500/20">
                      #{tag}
                    </span>
                  ))}
                  {(selectedHostForProfile.languages || []).map((lang, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-full bg-white/10 text-zinc-300 text-[10px] font-bold border border-white/10">
                      🗣️ {lang}
                    </span>
                  ))}
                </div>
              </div>

              {/* Prominent Action Buttons */}
              <div className="pt-2 pb-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const h = selectedHostForProfile;
                    setSelectedHostForProfile(null);
                    navigate('/messages', { state: { chatWithHost: h } });
                  }}
                  className="py-3.5 px-3 rounded-2xl font-black text-xs sm:text-sm bg-white/10 hover:bg-white/15 text-pink-200 border border-pink-500/30 flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer"
                >
                  <MessageCircle size={18} className="text-pink-400 shrink-0" />
                  <span className="truncate">Chat</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const h = selectedHostForProfile;
                    setSelectedHostForProfile(null);
                    navigate('/video', { state: { directCallHost: h } });
                  }}
                  className="py-3.5 px-3 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all cursor-pointer bg-gradient-to-r from-pink-500 via-rose-500 to-amber-400 text-white shadow-[0_4px_25px_rgba(244,63,94,0.55)] hover:brightness-110"
                >
                  <Video size={18} className="animate-pulse shrink-0" />
                  <span className="truncate">
                    Video Call ({selectedHostForProfile.ratePerMinute}🪙/m)
                  </span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
