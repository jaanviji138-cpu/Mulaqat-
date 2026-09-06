import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const PUBLIC_STANDALONE_ORIGIN = "https://ais-pre-vqbwp4sc63dudzw5wd5mmy-415317948408.asia-southeast1.run.app";

export function getPublicOrigin(): string {
  if (typeof window === 'undefined') return PUBLIC_STANDALONE_ORIGIN;
  
  try {
    const origin = window.location.origin;
    // If running inside AI Studio iframe or dev origin
    if (origin.includes('aistudio.google.com') || origin.includes('google.com') || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return PUBLIC_STANDALONE_ORIGIN;
    }
    if (origin.includes('-dev-')) {
      return origin.replace('-dev-', '-pre-');
    }
    if (origin.includes('run.app')) {
      return origin;
    }
  } catch (e) {
    // fallback
  }

  return PUBLIC_STANDALONE_ORIGIN;
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) {
    // Fallback to execCommand
  }

  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    textArea.setAttribute("readonly", "");
    document.body.appendChild(textArea);
    textArea.select();
    textArea.setSelectionRange(0, 99999);
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.warn("Clipboard copy fallback error:", err);
    return false;
  }
}
