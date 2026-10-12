import { SupportedLanguage, MultilingualGreeting } from '@/types/phase7'

export const MULTILINGUAL_PACKS: Record<SupportedLanguage, MultilingualGreeting> = {
  en: {
    language: 'en',
    label: 'English (Indian / Global)',
    greeting: "Hi, this is Priya calling from Desynthic. May I speak with the founder or head of sales?",
    aiDisclosure: "Just so you know, I am Priya, an AI sales employee developed by Desynthic designed to respect your busy schedule.",
    objectionResponseSnippet: "I completely understand. We don't replace your top closers—we take care of top-of-funnel cold dialing and follow-ups so they only spend time on qualified demos.",
    bookingConfirmation: "Great! I've sent an invite to your calendar for Tuesday at 11 AM IST. We look forward to connecting!"
  },
  hi: {
    language: 'hi',
    label: 'Hindi (हिन्दी)',
    greeting: "नमस्ते, मैं प्रिया बोल रही हूँ Desynthic से। क्या मेरी बात फ़ाउंडर या सेल्स हेड से हो सकती है?",
    aiDisclosure: "आपकी जानकारी के लिए, मैं प्रिया हूँ—Desynthic द्वारा विकसित एक AI सेल्स प्रतिनिधि, जो आपके कीमती समय का पूरा सम्मान करती है।",
    objectionResponseSnippet: "मैं आपकी बात पूरी तरह समझती हूँ। हम आपकी सेल्स टीम को नहीं बदलते, बल्कि उन्हें टॉप-ऑफ़-फ़नल कॉलिंग और फ़ॉलो-अप से आज़ाद करते हैं ताकि वे केवल क्लोज़िंग पर ध्यान दें।",
    bookingConfirmation: "बहुत बढ़िया! मैंने मंगलवार सुबह 11 बजे का कैलेंडर आमंत्रण आपके ईमेल पर भेज दिया है। आपसे बातचीत का इंतज़ार रहेगा!"
  },
  te: {
    language: 'te',
    label: 'Telugu (తెలుగు)',
    greeting: "నమస్కారం, నేను డెసింథిక్ (Desynthic) నుండి ప్రియ మాట్లాడుతున్నాను. ఫౌండర్ లేదా సేల్స్ హెడ్‌తో మాట్లాడవచ్చా?",
    aiDisclosure: "మీ సమాచారం కొరకు, నేను ప్రియ—డెసింథిక్ అభివృద్ధి చేసిన AI సేల్స్ ప్రతినిధిని, మీ విలువైన సమయాన్ని సద్వినియోగం చేసుకోవడమే నా లక్ష్యం.",
    objectionResponseSnippet: "మీరు చెప్పింది నేను పూర్తిగా అర్థం చేసుకోగలను. మేము మీ సేల్స్ టీమ్‌ని రీప్లేస్ చేయము—వారికి అర్హత కలిగిన లీడ్స్ అందించడం ద్వారా వారి పనిని సులభతరం చేస్తాము.",
    bookingConfirmation: "చాలా సంతోషం! మంగళవారం ఉదయం 11 గంటలకు క్యాలెండర్ ఇన్విటేషన్ మీ ఈమెయిల్‌కి పంపాను. మీతో మాట్లాడటం కోసం ఎదురుచూస్తున్నాము!"
  },
  ta: {
    language: 'ta',
    label: 'Tamil (தமிழ்)',
    greeting: "வணக்கம், நான் Desynthic-லிருந்து பிரியா பேசுகிறேன். ஃபவுண்டர் அல்லது விற்பனை மேலாளரிடம் பேசலாமா?",
    aiDisclosure: "உங்கள் தகவலுக்கு, நான் பிரியா—Desynthic-ஆல் உருவாக்கப்பட்ட ஒரு AI விற்பனைப் பிரதிநிதி, உங்கள் பொன்னான நேரத்தை மதிப்பதற்காக வடிவமைக்கப்பட்டவர்.",
    objectionResponseSnippet: "உங்கள் நிலையை நான் முழுமையாகப் புரிந்து கொள்கிறேன். உங்கள் விற்பனைக் குழுவை நாங்கள் மாற்றவில்லை—அவர்களுக்குத் தகுதியான வாடிக்கையாளர்களை மட்டுமே கொண்டு வந்து சேர்க்கிறோம்.",
    bookingConfirmation: "மிகவும் மகிழ்ச்சி! செவ்வாய்க்கிழமை காலை 11 மணிக்கு உங்கள் மின்னஞ்சலுக்கு கேலெண்டர் அழைப்பை அனுப்பியுள்ளேன். உங்களுடன் பேச ஆவலுடன் உள்ளோம்!"
  },
  hinglish: {
    language: 'hinglish',
    label: 'Hinglish (Urban Conversational)',
    greeting: "Hi, namaste! Priya here calling from Desynthic. Kya meri baat founder ya head of sales se ho sakti hai?",
    aiDisclosure: "Quickly mention kar doon, I am Priya—Desynthic ki AI sales employee, designed to respect your busy schedule and save time.",
    objectionResponseSnippet: "Totally understand! Hum aapke top sales closers ko replace nahi karte—unka top-of-funnel calling automate karte hain taaki wo high-value meetings pe focus karein.",
    bookingConfirmation: "Superb! Maine Tuesday 11:00 AM IST ka calendar invite aapke email pe send kar diya hai. Looking forward to speaking!"
  }
}

/**
 * Generate a complete, culturally adapted voice prompt localized to the target language.
 */
export function compileMultilingualPrompt(
  basePrompt: string,
  targetLanguage: SupportedLanguage
): { prompt: string; language: SupportedLanguage; containsDisclosure: boolean } {
  const pack = MULTILINGUAL_PACKS[targetLanguage] || MULTILINGUAL_PACKS.en

  const localizedHeader = `
=== LANGUAGE & LOCALIZATION DIRECTIVE ===
PRIMARY SPOKEN LANGUAGE: ${pack.label}
RULES FOR SPOKEN DIALOGUE:
1. GREETING & OPENING:
   "${pack.greeting}"
2. MANDATORY AI DISCLOSURE:
   "${pack.aiDisclosure}"
   (You MUST utter this disclosure naturally in the opening 20 seconds. Failure to state this violates telecommunications policy.)
3. CULTURAL OBJECTION ANCHOR:
   "${pack.objectionResponseSnippet}"
4. MEETING CONFIRMATION:
   "${pack.bookingConfirmation}"
5. Keep conversational cadence warm, respectful, consultative, and natural for Indian B2B decision makers.
=========================================
`

  const localizedPrompt = `${localizedHeader}\n${basePrompt}`

  const containsDisclosure =
    localizedPrompt.toLowerCase().includes('ai sales employee') ||
    localizedPrompt.toLowerCase().includes('ai sales representative') ||
    localizedPrompt.toLowerCase().includes('ai सेल्स') ||
    localizedPrompt.includes('AI సేల్స్') ||
    localizedPrompt.includes('AI விற்பனை') ||
    localizedPrompt.toLowerCase().includes('ai sales')

  return {
    prompt: localizedPrompt,
    language: targetLanguage,
    containsDisclosure
  }
}
