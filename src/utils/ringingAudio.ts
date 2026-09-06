// Ringing Audio Controller - Delegates to central GlobalAudioManager
import { globalAudioManager, AudioManagerState } from '@/services/globalAudioManager';

export interface RingingTriggerOptions {
  onAutoplayBlocked?: () => void;
  onAutoplayAllowed?: () => void;
  volume?: number;
}

export class RingingAudioController {
  public triggerRinging(options: RingingTriggerOptions = {}): void {
    globalAudioManager.startIncomingRingtone({
      volume: options.volume ?? 0.95,
      onPlay: options.onAutoplayAllowed,
      onBlocked: options.onAutoplayBlocked
    });
  }

  public handleExplicitUserUnblock(): void {
    globalAudioManager.unblockAudio();
  }

  public stopRinging(): void {
    globalAudioManager.stopIncomingRingtone();
  }

  public get isBlocked(): boolean {
    return globalAudioManager.getState().isAudioBlocked;
  }

  public get isAudioPlaying(): boolean {
    return globalAudioManager.getState().isIncomingRinging;
  }
}

export const ringingController = new RingingAudioController();
export { globalAudioManager };
