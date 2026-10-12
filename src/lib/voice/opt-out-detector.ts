/**
 * PRD v2.1 Phase 3: Multilingual In-Call Opt-Out Detector
 * Supports English, Hindi, and Hinglish.
 * Triggers immediate suppression list insertion when refusal is detected.
 */

import { InCallOptOutResult } from '@/types/voice-v2';
import { addToSuppressionList } from '@/lib/safety/can-contact';

// Refusal patterns across English, Hindi, and Hinglish
const OPT_OUT_PATTERNS: { pattern: RegExp; lang: 'en' | 'hi' | 'hinglish'; label: string }[] = [
  // English patterns
  { pattern: /\b(stop\s+(calling|calling\s+me|this)|do\s+not\s+call|don'?t\s+call(\s+me)?(\s+again)?)\b/i, lang: 'en', label: 'stop calling' },
  { pattern: /\b(remove\s+(my\s+number|me\s+from\s+the\s+list)|take\s+me\s+off(\s+the\s+list)?|delete\s+my\s+number)\b/i, lang: 'en', label: 'remove number' },
  { pattern: /\b(unsubscribe|put\s+me\s+on\s+(the\s+)?dnd|never\s+call\s+again)\b/i, lang: 'en', label: 'dnd request' },
  { pattern: /\b(not\s+interested[,.\s]+stop(\s+calling)?)\b/i, lang: 'en', label: 'not interested stop' },

  // Hinglish patterns (Latin script Hindi/English mix)
  { pattern: /\b(call\s+mat\s+karo|dobara\s+call\s+mat\s+karna|phir\s+se\s+call\s+mat\s+karna)\b/i, lang: 'hinglish', label: 'call mat karo' },
  { pattern: /\b(number\s+(remove|delete|hata)\s+(kar\s+do|dijiye|kardo)|mera\s+number\s+hatao)\b/i, lang: 'hinglish', label: 'number hata do' },
  { pattern: /\b(list\s+se\s+hata\s+do|mujhe\s+call\s+mat\s+kariye|aise\s+call\s+mat\s+karo)\b/i, lang: 'hinglish', label: 'list se hata do' },
  { pattern: /\b(nahi\s+chahiye[,.\s]+(call\s+mat\s+karo|phone\s+rakho))\b/i, lang: 'hinglish', label: 'nahi chahiye stop' },
  { pattern: /\b(phone\s+mat\s+karna|phone\s+mat\s+karo)\b/i, lang: 'hinglish', label: 'phone mat karo' },

  // Hindi patterns (Devanagari script)
  { pattern: /(कॉल\s*मत\s*(करो|कीजिए|करना)|फोन\s*मत\s*(करो|कीजिए|करना))/, lang: 'hi', label: 'कॉल मत करो' },
  { pattern: /(नंबर\s*(हटा\s*दो|डिलीट\s*करो|हटाएं)|सूची\s*से\s*हटा\s*दो)/, lang: 'hi', label: 'नंबर हटा दो' },
  { pattern: /(दोबारा\s*कॉल\s*मत\s*करना|फिर\s*से\s*फोन\s*मत\s*करना)/, lang: 'hi', label: 'दोबारा कॉल मत करना' },
  { pattern: /(नहीं\s*चाहिए\s*फोन\s*रखो)/, lang: 'hi', label: 'नहीं चाहिए फोन रखो' },
];

/**
 * Detects whether the prospect utterance expresses an explicit opt-out or DND request.
 */
export function detectInCallOptOut(text: string): InCallOptOutResult {
  if (!text || text.trim().length === 0) {
    return { isOptOut: false, detectedLanguage: 'en', confidence: 0 };
  }

  const normalized = text.toLowerCase().trim();

  for (const item of OPT_OUT_PATTERNS) {
    if (item.pattern.test(normalized)) {
      return {
        isOptOut: true,
        phrase: item.label,
        detectedLanguage: item.lang,
        confidence: 0.98,
      };
    }
  }

  return { isOptOut: false, detectedLanguage: 'en', confidence: 0 };
}

/**
 * Executes immediate lead suppression and generates polite exit utterance.
 */
export async function executeInCallOptOut(params: {
  workspaceId: string;
  phoneNumber: string;
  leadId?: string;
  callId?: string;
  triggerPhrase?: string;
  language?: 'en' | 'hi' | 'hinglish';
}): Promise<{
  success: boolean;
  politeExitUtterance: string;
}> {
  const { workspaceId, phoneNumber, language = 'en' } = params;

  // Immediately insert into suppression list
  addToSuppressionList(workspaceId, phoneNumber);

  // Polite exit script according to prospect language
  let politeExitUtterance = 'I completely understand. I have removed your number from our calling list and will not call again. Have a good day.';

  if (language === 'hi' || language === 'hinglish') {
    politeExitUtterance = 'Main samajh sakti hoon. Maine aapka number hamari calling list se hata diya hai aur aage se call nahi aayega. Shubh din.';
  }

  return {
    success: true,
    politeExitUtterance,
  };
}
