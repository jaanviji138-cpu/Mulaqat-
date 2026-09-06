// Location detection and storage utility for Maxo Live

const INDIAN_STATES = [
  'हरियाणा (Haryana)',
  'पंजाब (Punjab)',
  'दिल्ली (Delhi)',
  'उत्तर प्रदेश (UP)',
  'राजस्थान (Rajasthan)',
  'महाराष्ट्र (Mumbai)',
  'गुजरात (Gujarat)',
  'मध्य प्रदेश (MP)',
  'बिहार (Bihar)',
  'उत्तराखंड (UK)'
];

export function getStoredUserLocation(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('maxo_user_location');
    if (saved) return saved;
  }
  return 'हरियाणा';
}

export function saveUserLocation(locationName: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('maxo_user_location', locationName);
  }
}

/**
 * Detects location via browser geolocation if granted or resolves to Indian state
 */
export async function detectAndSaveUserLocation(): Promise<string> {
  if (typeof window === 'undefined') return 'हरियाणा';

  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      const fallback = 'हरियाणा';
      saveUserLocation(fallback);
      resolve(fallback);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let detected = 'हरियाणा';

        // Approximate Indian State boundaries by lat/long
        if (latitude >= 28.3 && latitude <= 28.9 && longitude >= 76.8 && longitude <= 77.4) {
          detected = 'दिल्ली (Delhi)';
        } else if (latitude >= 27.6 && latitude <= 30.9 && longitude >= 74.4 && longitude <= 77.6) {
          detected = 'हरियाणा (Haryana)';
        } else if (latitude >= 29.5 && latitude <= 32.5 && longitude >= 73.8 && longitude <= 76.9) {
          detected = 'पंजाब (Punjab)';
        } else if (latitude >= 23.8 && latitude <= 30.4 && longitude >= 77.0 && longitude <= 84.6) {
          detected = 'उत्तर प्रदेश (UP)';
        } else if (latitude >= 18.5 && latitude <= 20.0 && longitude >= 72.7 && longitude <= 73.2) {
          detected = 'महाराष्ट्र (Mumbai)';
        } else if (latitude >= 24.5 && latitude <= 30.2 && longitude >= 69.5 && longitude <= 78.2) {
          detected = 'राजस्थान (Rajasthan)';
        } else {
          // Default to high-frequency user region
          detected = 'हरियाणा';
        }

        saveUserLocation(detected);
        resolve(detected);
      },
      (err) => {
        console.info("Geolocation skipped or permission prompt closed:", err.message);
        // If user is from India or default
        const fallback = localStorage.getItem('maxo_user_location') || 'हरियाणा';
        saveUserLocation(fallback);
        resolve(fallback);
      },
      { timeout: 4000, maximumAge: 60000 }
    );
  });
}
