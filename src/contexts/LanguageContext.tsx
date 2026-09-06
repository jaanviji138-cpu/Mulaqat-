import React, { createContext, useContext, useState, useEffect } from 'react';

export type AppLanguage = 'en' | 'hi';

interface LanguageContextType {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  t: (key: string, fallback?: string) => string;
}

const DICTIONARY: Record<string, { en: string; hi: string }> = {
  // Navigation
  'nav.video': { en: 'Video Call', hi: 'वीडियो कॉल' },
  'nav.moments': { en: 'Moments', hi: 'मोमेंट्स' },
  'nav.messages': { en: 'Messages', hi: 'मैसेज' },
  'nav.profile': { en: 'Me', hi: 'Me' },
  'nav.me': { en: 'Me', hi: 'Me' },
  'nav.calls': { en: 'Calls', hi: 'कॉल' },

  // General Actions
  'common.recharge': { en: 'Recharge', hi: 'रिचार्ज' },
  'common.coins': { en: 'Coins', hi: 'कॉइन्स' },
  'common.beans': { en: 'Beans', hi: 'बीन्स' },
  'common.diamonds': { en: 'Diamonds', hi: 'डायमंड्स' },
  'common.wallet': { en: 'Wallet', hi: 'वॉलेट' },
  'common.settings': { en: 'Settings', hi: 'सेटिंग्स' },
  'common.language': { en: 'Language', hi: 'भाषा' },
  'common.online': { en: 'Online', hi: 'ऑनलाइन' },
  'common.busy': { en: 'Busy', hi: 'व्यस्त' },
  'common.offline': { en: 'Offline', hi: 'ऑफलाइन' },
  'common.search': { en: 'Search hosts...', hi: 'होस्ट खोजें...' },
  'common.follow': { en: 'Follow', hi: 'फॉलो' },
  'common.following': { en: 'Following', hi: 'फॉलोइंग' },
  'common.followers': { en: 'Followers', hi: 'फॉलोअर्स' },
  'common.visitors': { en: 'Visitors', hi: 'विजिटर्स' },
  'common.level': { en: 'Level', hi: 'लेवल' },
  'common.copy': { en: 'Copy', hi: 'कॉपी' },
  'common.copied': { en: 'Copied', hi: 'कॉपी हुआ' },
  'common.cancel': { en: 'Cancel', hi: 'रद्द करें' },
  'common.confirm': { en: 'Confirm', hi: 'पुष्टि करें' },
  'common.save': { en: 'Save', hi: 'सेव करें' },
  'common.close': { en: 'Close', hi: 'बंद करें' },
  'common.enter': { en: 'Enter', hi: 'प्रवेश करें' },
  'common.logout': { en: 'Log Out', hi: 'लॉगआउट' },

  // Video Calls
  'calls.title': { en: '1-on-1 Video Call', hi: '1-on-1 वीडियो कॉल' },
  'calls.subtitle': { en: 'Connect privately with verified female hosts', hi: 'सत्यापित फीमेल होस्ट से प्राइवेट बात करें' },
  'calls.rate': { en: 'Coins/min', hi: 'कॉइन्स/मिनट' },
  'calls.startCall': { en: 'Video Call', hi: 'वीडियो कॉल करें' },
  'calls.endCall': { en: 'End Call', hi: 'कॉल समाप्त करें' },
  'calls.connecting': { en: 'Connecting...', hi: 'कनेक्ट हो रहा है...' },
  'calls.incoming': { en: 'Incoming Call', hi: 'इनकमिंग कॉल' },
  'calls.accept': { en: 'Accept', hi: 'उठाएं' },
  'calls.decline': { en: 'Decline', hi: 'काटें' },
  'calls.insufficientCoins': { en: 'Insufficient coins! Please recharge.', hi: 'अपर्याप्त कॉइन्स! कृपया रिचार्ज करें।' },

  // Moments
  'moments.title': { en: 'Moments Feed', hi: 'मोमेंट्स फीड' },
  'moments.subtitle': { en: 'Photos and Stories from Verified Hosts', hi: 'सत्यापित होस्ट के फोटो और स्टोरी' },
  'moments.newPost': { en: 'New Post', hi: 'नया पोस्ट' },
  'moments.myStory': { en: 'My Story', hi: 'मेरी स्टोरी' },
  'moments.sendGift': { en: 'Send Gift', hi: 'गिफ्ट भेजें' },
  'moments.giftSent': { en: 'Gift Sent!', hi: 'गिफ्ट भेजा गया!' },
  'moments.femaleOnly': { en: 'Only female hosts can post moments and stories.', hi: 'सिर्फ महिला होस्ट ही मोमेंट्स और स्टोरी पोस्ट कर सकती हैं।' },
  'moments.comments': { en: 'Comments', hi: 'कमेंट्स' },
  'moments.like': { en: 'Like', hi: 'लाइक' },

  // Messages & Customer Support
  'messages.title': { en: 'Messages', hi: 'मैसेज' },
  'messages.official': { en: 'Mulaqat Official', hi: 'मुलाकात ऑफिशियल' },
  'messages.typeMessage': { en: 'Type a message...', hi: 'मैसेज लिखें...' },
  'messages.send': { en: 'Send', hi: 'भेजें' },
  'messages.missedCall': { en: 'Missed Call', hi: 'मिस्ड कॉल' },

  // Profile & Wallet
  'profile.myAccount': { en: 'My Profile', hi: 'मेरी प्रोफ़ाइल' },
  'profile.myWallet': { en: 'My Wallet', hi: 'मेरा वॉलेट' },
  'profile.coinBalance': { en: 'Coin Balance', hi: 'सिक्के का बैलेंस' },
  'profile.rechargeCoins': { en: 'Recharge Coins', hi: 'कॉइन्स रिचार्ज' },
  'profile.instantTopup': { en: 'Instant Topup', hi: 'तुरंत टॉप-अप' },
  'profile.txHistory': { en: 'Transaction History', hi: 'लेन-देन इतिहास' },
  'profile.beansWallet': { en: 'Beans & Earnings', hi: 'बीन्स एवं कमाई' },
  'profile.callHistory': { en: 'Call History', hi: 'कॉल हिस्ट्री' },
  'profile.callHistoryDesc': { en: 'Past video calls and coin expense records', hi: 'पिछली वीडियो कॉल्स और कॉइन्स रिकॉर्ड' },
  'profile.customerSupport': { en: 'Customer Support', hi: 'कस्टमर सपोर्ट' },
  'profile.helpCenter': { en: 'Help Center', hi: 'सहायता केंद्र' },
  'profile.helpCenterDesc': { en: 'Coins, host, recharge issues and 24/7 live chat', hi: 'कॉइन्स, होस्ट, रिचार्ज समस्या व 24/7 लाइव चैट' },
  'profile.feedback': { en: 'Feedback', hi: 'फ़ीडबैक' },
  'profile.feedbackDesc': { en: 'Host conversation experience and ratings', hi: 'होस्ट के साथ बातचीत का अनुभव और रेटिंग' },
  'profile.aboutUs': { en: 'About Mulaqat', hi: 'मुलाकात के बारे में' },
  'profile.privacyPolicy': { en: 'Privacy Policy', hi: 'गोपनीयता नीति' },
  'profile.userAgreement': { en: 'User Agreement', hi: 'उपयोगकर्ता अनुबंध' },
  'profile.editProfile': { en: 'Edit Profile', hi: 'प्रोफ़ाइल बदलें' },
  'profile.vipCenter': { en: 'VIP Center', hi: 'वीआईपी सेंटर' },
  'profile.backpack': { en: 'Backpack', hi: 'बैगपैक' },
  'profile.store': { en: 'Theme Store', hi: 'थीम स्टोर' },
  'profile.applyHost': { en: 'Apply for Hosting', hi: 'अप्लाई फॉर होस्टिंग' },
  'profile.applyHostDesc': { en: 'Become a verified 1-on-1 private video host', hi: 'सत्यापित 1-on-1 प्राइवेट वीडियो होस्ट बनें' },
  'profile.applyReview': { en: 'Application Under Review', hi: 'आवेदन समीक्षाधीन है' },
  'profile.applyReviewDesc': { en: '24-hour review in progress • Tap to check status', hi: '24 घंटे का रिव्यू जारी है • स्थिति देखने के लिए टैप करें' },
  'profile.hostCenter': { en: 'Host Center', hi: 'होस्ट सेंटर' },
  'profile.hostCenterDesc': { en: 'Host dashboard and video call controls', hi: 'होस्ट डैशबोर्ड व वीडियो कॉल नियंत्रण' },
  'profile.blockedList': { en: 'Blocked List', hi: 'ब्लॉक सूची' },
  'profile.yearsOld': { en: 'yrs', hi: 'वर्ष' },
  'profile.boy': { en: 'Boy', hi: 'लड़का' },
  'profile.girl': { en: 'Girl', hi: 'लड़की' },

  // Support & Help Center
  'support.helpCenter': { en: 'Help Center', hi: 'सहायता केंद्र' },
  'support.helpSubtitle': { en: '24/7 Live Customer Care & Instant Assistance', hi: '24/7 लाइव कस्टमर केयर एवं त्वरित सहायता' },
  'support.liveChat': { en: '24/7 Live Support Chat', hi: '24/7 लाइव चैट' },
  'support.liveChatDesc': { en: 'Talk directly with a customer care representative', hi: 'कस्टमर केयर एग्जीक्यूटिव से तुरंत बात करें' },
  'support.selectTopic': { en: 'Select Problem Topic:', hi: 'समस्या का प्रकार चुनें:' },
  'support.coinsIssue': { en: 'Coins Issue', hi: 'कॉइन्स रिलेटेड' },
  'support.hostIssue': { en: 'Host Issue', hi: 'होस्ट रिलेटेड' },
  'support.rechargeIssue': { en: 'Recharge Issue', hi: 'रिचार्ज रिलेटेड' },
  'support.askInChat': { en: 'Get Help in Live Chat on this Topic', hi: 'इस विषय पर लाइव चैट में सहायता लें' },

  // Feedback
  'feedback.title': { en: 'Host Call Feedback', hi: 'फ़ीडबैक' },
  'feedback.subtitle': { en: 'Share your 1-on-1 video call experience with hosts', hi: 'होस्ट के साथ अपनी वीडियो कॉल का अनुभव साझा करें' },
  'feedback.q1': { en: 'How was your conversation with the host?', hi: 'होस्ट के साथ बात करके कैसा लगा?' },
  'feedback.q2': { en: 'Host behavior and interaction quality:', hi: 'बातचीत की गुणवत्ता:' },
  'feedback.additional': { en: 'Additional Comments (Optional):', hi: 'अन्य कोई सुझाव या टिप्पणी (वैकल्पिक):' },
  'feedback.placeholder': { en: 'Write anything you would like to share about the host or app...', hi: 'होस्ट या ऐप्लिकेशन के बारे में कुछ और कहना चाहते हैं तो लिखें...' },
  'feedback.submit': { en: 'Submit Feedback', hi: 'फ़ीडबैक सबमिट करें' },

  // Hosting Application
  'hosting.title': { en: 'Apply for Hosting', hi: 'अप्लाई फॉर होस्टिंग' },
  'hosting.underReview': { en: 'Application Under Review', hi: 'होस्टिंग समीक्षाधीन है' },
  'hosting.subtitle': { en: 'Become a verified 1-on-1 private video host', hi: '1-on-1 वीडियो होस्ट बनने की आवेदन प्रक्रिया' },
  'hosting.underReviewSubtitle': { en: 'Application is undergoing 24-hour verification review', hi: 'आवेदन 24 घंटे की सत्यापन प्रक्रिया में है' },
  'hosting.waitingBadge': { en: '24h Review Window', hi: '24 घंटे वेटिंग' },
  'hosting.secureBadge': { en: 'Secure Verification', hi: 'सुरक्षित सत्यापन' },

  // Settings
  'settings.title': { en: 'Settings', hi: 'सेटिंग्स' },
  'settings.subtitle': { en: 'Language, sound, cache & account preferences', hi: 'भाषा, साउंड, कैशे एवं अकाउंट विकल्प' },
  'settings.languageOption': { en: 'App Language', hi: 'ऐप की भाषा' },
  'settings.languageDesc': { en: 'Choose your preferred language (English or Hindi)', hi: 'अपनी पसंदीदा भाषा चुनें (अंग्रेजी या हिंदी)' },
  'settings.notifSound': { en: 'Notification Sound', hi: 'नोटिफिकेशन साउंड' },
  'settings.notifSoundDesc': { en: 'Ringtone for messages and incoming calls', hi: 'संदेश और इनकमिंग कॉल की रिंगटोन' },
  'settings.notifVibrate': { en: 'Vibration', hi: 'वाइब्रेशन' },
  'settings.notifVibrateDesc': { en: 'Vibrate device on incoming calls', hi: 'कॉल आने पर फ़ोन का कंपन' },
  'settings.clearCache': { en: 'Clear App Cache', hi: 'कैशे खाली करें' },
  'settings.clearCacheDesc': { en: 'Clean temporary media to free storage', hi: 'अस्थायी डेटा हटाकर स्टोरेज खाली करें' },
  'settings.appVersion': { en: 'App Version', hi: 'ऐप वर्ज़न' },
  'settings.logoutConfirm': { en: 'Are you sure you want to log out?', hi: 'क्या आप निश्चित रूप से लॉगआउट करना चाहते हैं?' },

  // Login
  'login.title': { en: 'Mulaqat', hi: 'मुलाकात' },
  'login.tagline': { en: '1-on-1 Private Video Call', hi: '1-on-1 प्राइवेट वीडियो कॉल' },
  'login.selectGender': { en: 'Select Your Gender', hi: 'अपना जेंडर चुनें' },
  'login.selectGenderDesc': { en: 'Tap to select and enter instantly', hi: 'टैप करके तुरंत प्रवेश करें' },
  'login.boy': { en: 'Boy', hi: 'लड़का' },
  'login.girl': { en: 'Girl', hi: 'लड़की' },
  'login.enter': { en: 'ENTER NOW', hi: 'प्रवेश करें' },
  'login.welcomeBonus': { en: '+100 Coins Welcome Bonus Included 🪙', hi: '+100 कॉइन्स वेलकम बोनस शामिल 🪙' },
  'login.agreement': { en: 'I have read and agree to User Terms & Privacy Policy', hi: 'मैंने नियम व शर्तें और गोपनीयता नीति स्वीकार की' }
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key: string, fallback?: string) => fallback || key
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<AppLanguage>(() => {
    try {
      const saved = localStorage.getItem('mulaqat_language') || localStorage.getItem('maxo_app_language');
      if (saved === 'hi' || saved === 'en') return saved;
    } catch (e) {}
    return 'en'; // Default English as requested by user!
  });

  const setLanguage = (lang: AppLanguage) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('mulaqat_language', lang);
      localStorage.setItem('maxo_app_language', lang);
      window.dispatchEvent(new CustomEvent('language-changed', { detail: { language: lang } }));
    } catch (e) {}
  };

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'mulaqat_language' && (e.newValue === 'en' || e.newValue === 'hi')) {
        setLanguageState(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const t = (key: string, fallback?: string): string => {
    const entry = DICTIONARY[key];
    if (entry) {
      return entry[language] || entry.en;
    }
    return fallback !== undefined ? fallback : key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage() {
  return useContext(LanguageContext);
}
