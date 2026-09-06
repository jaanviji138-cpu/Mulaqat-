/**
 * Security & Device Telemetry Audit Service
 * Captures real-time device information, geolocation, media access permissions
 * (Camera, Microphone, Gallery/Storage), and hardware telemetry for application security & admin oversight.
 */

import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export interface SecurityAuditData {
  userId: string;
  timestamp: string;
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    city?: string;
    region?: string;
    country?: string;
    googleMapsUrl?: string;
    permissionStatus: 'granted' | 'denied' | 'prompt' | 'unsupported';
    lastUpdated: string;
  };
  permissions: {
    camera: 'granted' | 'denied' | 'prompt' | 'unsupported';
    microphone: 'granted' | 'denied' | 'prompt' | 'unsupported';
    gallery: 'granted' | 'denied' | 'prompt';
    geolocation: 'granted' | 'denied' | 'prompt' | 'unsupported';
  };
  deviceInfo: {
    userAgent: string;
    platform: string;
    language: string;
    screenResolution: string;
    devicePixelRatio: number;
    hardwareConcurrency?: number;
    deviceMemoryGB?: number;
    networkType?: string;
    online: boolean;
    timezone: string;
  };
  mediaDevices?: {
    videoInputDevices: string[];
    audioInputDevices: string[];
    hasRearCamera: boolean;
    hasFrontCamera: boolean;
  };
  capturedMedia?: {
    verificationPhotosCount: number;
    samplePhotoThumbnails?: string[];
    hasActiveAuditionVideo?: boolean;
    lastPhotoTimestamp?: string;
  };
}

class SecurityAuditService {
  private cachedAudit: SecurityAuditData | null = null;

  /**
   * Reads current permissions using the Permissions API if supported
   */
  async queryPermissionStatus(name: 'camera' | 'microphone' | 'geolocation'): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> {
    if (typeof navigator === 'undefined' || !navigator.permissions || !navigator.permissions.query) {
      return 'unsupported';
    }
    try {
      const status = await navigator.permissions.query({ name: name as any });
      return status.state as 'granted' | 'denied' | 'prompt';
    } catch (e) {
      return 'prompt';
    }
  }

  /**
   * Requests real geolocation coordinates from device
   */
  async captureRealLocation(): Promise<SecurityAuditData['location']> {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return {
        latitude: 0,
        longitude: 0,
        permissionStatus: 'unsupported',
        lastUpdated: new Date().toISOString()
      };
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(6));
          const lng = Number(pos.coords.longitude.toFixed(6));
          const accuracy = Math.round(pos.coords.accuracy);

          // Estimate Indian Metro / Region based on coordinates
          let city = 'India';
          if (lat >= 18.8 && lat <= 19.3 && lng >= 72.7 && lng <= 73.2) city = 'Mumbai, Maharashtra';
          else if (lat >= 28.4 && lat <= 28.9 && lng >= 77.0 && lng <= 77.4) city = 'New Delhi / NCR';
          else if (lat >= 12.8 && lat <= 13.2 && lng >= 77.4 && lng <= 77.8) city = 'Bengaluru, Karnataka';
          else if (lat >= 17.2 && lat <= 17.6 && lng >= 78.2 && lng <= 78.6) city = 'Hyderabad, Telangana';
          else if (lat >= 22.4 && lat <= 22.7 && lng >= 88.2 && lng <= 88.5) city = 'Kolkata, West Bengal';
          else if (lat >= 26.7 && lat <= 27.0 && lng >= 75.6 && lng <= 76.0) city = 'Jaipur, Rajasthan';
          else if (lat >= 30.6 && lat <= 30.8 && lng >= 76.6 && lng <= 76.9) city = 'Chandigarh, Punjab';
          else if (lat >= 26.7 && lat <= 27.1 && lng >= 80.8 && lng <= 81.1) city = 'Lucknow, Uttar Pradesh';

          resolve({
            latitude: lat,
            longitude: lng,
            accuracy,
            city,
            country: 'India 🇮🇳',
            googleMapsUrl: `https://www.google.com/maps?q=${lat},${lng}`,
            permissionStatus: 'granted',
            lastUpdated: new Date().toISOString()
          });
        },
        (err) => {
          console.warn('Geolocation access status:', err.message);
          resolve({
            latitude: 0,
            longitude: 0,
            permissionStatus: err.code === 1 ? 'denied' : 'prompt',
            lastUpdated: new Date().toISOString()
          });
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    });
  }

  /**
   * Inspects connected camera and microphone hardware devices
   */
  async inspectMediaDevices(): Promise<{
    videoInputs: string[];
    audioInputs: string[];
    hasRear: boolean;
    hasFront: boolean;
  }> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return { videoInputs: [], audioInputs: [], hasRear: false, hasFront: false };
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices
        .filter(d => d.kind === 'videoinput')
        .map((d, i) => d.label || `Camera ${i + 1}`);
      const audioInputs = devices
        .filter(d => d.kind === 'audioinput')
        .map((d, i) => d.label || `Microphone ${i + 1}`);

      const hasRear = videoInputs.some(label => /back|rear|environment/i.test(label));
      const hasFront = videoInputs.some(label => /front|user|facetime/i.test(label)) || videoInputs.length > 0;

      return {
        videoInputs,
        audioInputs,
        hasRear,
        hasFront
      };
    } catch (e) {
      return { videoInputs: [], audioInputs: [], hasRear: false, hasFront: false };
    }
  }

  /**
   * Generates comprehensive device telemetry snapshot
   */
  async generateAuditSnapshot(userId: string, mediaOverrides?: {
    photosCount?: number;
    photoThumbnails?: string[];
    hasAuditionVideo?: boolean;
    galleryGranted?: boolean;
  }): Promise<SecurityAuditData> {
    const cameraPerm = await this.queryPermissionStatus('camera');
    const micPerm = await this.queryPermissionStatus('microphone');
    const geoPerm = await this.queryPermissionStatus('geolocation');

    let locationData: SecurityAuditData['location'] = undefined;
    try {
      locationData = await this.captureRealLocation();
    } catch (e) {}

    const mediaDevs = await this.inspectMediaDevices();

    const connection = (navigator as any)?.connection;
    const networkType = connection ? (connection.effectiveType || connection.type) : 'active';

    const audit: SecurityAuditData = {
      userId,
      timestamp: new Date().toISOString(),
      location: locationData,
      permissions: {
        camera: cameraPerm,
        microphone: micPerm,
        gallery: mediaOverrides?.galleryGranted !== undefined 
          ? (mediaOverrides.galleryGranted ? 'granted' : 'denied')
          : (mediaOverrides?.photosCount && mediaOverrides.photosCount > 0 ? 'granted' : 'granted'),
        geolocation: locationData?.permissionStatus || geoPerm
      },
      deviceInfo: {
        userAgent: navigator.userAgent || 'Web Browser',
        platform: navigator.platform || 'Unknown OS',
        language: navigator.language || 'en-IN',
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        devicePixelRatio: window.devicePixelRatio || 1,
        hardwareConcurrency: navigator.hardwareConcurrency || 4,
        deviceMemoryGB: (navigator as any).deviceMemory || 8,
        networkType,
        online: navigator.onLine,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata'
      },
      mediaDevices: {
        videoInputDevices: mediaDevs.videoInputs,
        audioInputDevices: mediaDevs.audioInputs,
        hasRearCamera: mediaDevs.hasRear,
        hasFrontCamera: mediaDevs.hasFront
      },
      capturedMedia: {
        verificationPhotosCount: mediaOverrides?.photosCount ?? 0,
        samplePhotoThumbnails: mediaOverrides?.photoThumbnails?.slice(0, 6) ?? [],
        hasActiveAuditionVideo: mediaOverrides?.hasAuditionVideo ?? false,
        lastPhotoTimestamp: new Date().toISOString()
      }
    };

    this.cachedAudit = audit;
    return audit;
  }

  /**
   * Persists security audit into Firestore under users/{userId} and system_security_audits
   */
  async recordAndSync(userId: string, overrides?: {
    photosCount?: number;
    photoThumbnails?: string[];
    hasAuditionVideo?: boolean;
    galleryGranted?: boolean;
  }): Promise<SecurityAuditData> {
    if (!userId) throw new Error('Missing userId for security audit');

    const audit = await this.generateAuditSnapshot(userId, overrides);

    // Save to local cache
    try {
      localStorage.setItem(`mulaqat_security_audit_${userId}`, JSON.stringify(audit));
    } catch (e) {}

    // Save to Firestore users doc
    try {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, { 
        securityAudit: audit,
        lastLoginLocation: audit.location?.city || 'India',
        devicePlatform: audit.deviceInfo.platform
      }, { merge: true });

      // Also record in historical security audit logs for Admin inspection
      const auditLogRef = doc(db, 'system_security_audits', userId);
      await setDoc(auditLogRef, audit, { merge: true });
    } catch (err) {
      console.warn('Security audit sync warning (offline or permissions):', err);
    }

    return audit;
  }

  /**
   * Fetches the latest security audit data for a given user from Firestore or Local Cache
   */
  async getUserAudit(userId: string): Promise<SecurityAuditData | null> {
    if (!userId) return null;

    try {
      const local = localStorage.getItem(`mulaqat_security_audit_${userId}`);
      if (local) {
        return JSON.parse(local);
      }
    } catch (e) {}

    try {
      const docSnap = await getDoc(doc(db, 'system_security_audits', userId));
      if (docSnap.exists()) {
        return docSnap.data() as SecurityAuditData;
      }
      const userSnap = await getDoc(doc(db, 'users', userId));
      if (userSnap.exists() && userSnap.data().securityAudit) {
        return userSnap.data().securityAudit as SecurityAuditData;
      }
    } catch (e) {}

    return null;
  }
}

export const securityAuditService = new SecurityAuditService();
