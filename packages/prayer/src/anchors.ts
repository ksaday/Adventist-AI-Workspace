/**
 * Curated Scripture Anchors for Prayer Note.
 *
 * Implements:
 * - PR-P2-07 (Human-authored topical index, references only)
 * - Invariant 5 / ADR-0021 / SR-5.8 (No verse text bundled)
 */

import topicalData from "../../../data/topical/topical-scripture.v1.json";
import { PrayerType, ScriptureAnchor } from "./types.js";

interface RawTopic {
  id: string;
  titleEn: string;
  titleKo: string;
  anchorPassages: string[];
  keywords?: string[];
}

const TOPICS: RawTopic[] = topicalData.topics;

// Mapping passage IDs to canonical Bible references (no verse text!)
const PASSAGE_REFERENCE_MAP: Record<string, { en: string; ko: string; reasonEn: string; reasonKo: string }> = {
  "1PE.5.7": {
    en: "1 Peter 5:7",
    ko: "베드로전서 5:7",
    reasonEn: "Encourages casting every anxious care upon God because He cares for you personally.",
    reasonKo: "우리를 돌보시는 하나님께 모든 염려를 온전히 맡기도록 이끕니다.",
  },
  "MAT.11.28-MAT.11.30": {
    en: "Matthew 11:28-30",
    ko: "마태복음 11:28-30",
    reasonEn: "Christ's direct invitation to all who labor and are heavy laden to find true rest in Him.",
    reasonKo: "수고하고 무거운 짐 진 모든 자에게 참된 안식을 주시겠다는 그리스도의 초청입니다.",
  },
  "PHP.4.6-PHP.4.7": {
    en: "Philippians 4:6-7",
    ko: "빌립보서 4:6-7",
    reasonEn: "Assures that prayer with thanksgiving brings God's peace guarding heart and mind.",
    reasonKo: "감사함으로 아뢸 때 모든 지각에 뛰어난 하나님의 평강이 마음을 지키실 것을 확증합니다.",
  },
  "PSA.23.1-PSA.23.6": {
    en: "Psalm 23:1-6",
    ko: "시편 23:1-6",
    reasonEn: "Points to the Lord as our faithful Shepherd even in the valley of deep shadow.",
    reasonKo: "사망의 음침한 골짜기에서도 영원한 목자 되신 주님의 신실한 인도를 증거합니다.",
  },
  "PRO.3.5-PRO.3.6": {
    en: "Proverbs 3:5-6",
    ko: "잠언 3:5-6",
    reasonEn: "Calls for trusting the Lord with all our heart rather than our own understanding.",
    reasonKo: "자신의 지혜를 의지하지 않고 마음을 다해 여호와를 신뢰할 때 길을 지도하십니다.",
  },
  "JAS.1.5": {
    en: "James 1:5",
    ko: "야고보서 1:5",
    reasonEn: "Promises that God generously gives wisdom to all who ask in faith without reproach.",
    reasonKo: "믿음으로 지혜를 구하는 모든 자에게 후히 주시고 꾸짖지 않으시는 약속입니다.",
  },
  "1JN.1.9": {
    en: "1 John 1:9",
    ko: "요한일서 1:9",
    reasonEn: "Affirms that when we confess our sins, He is faithful and just to forgive and cleanse us.",
    reasonKo: "죄를 자복할 때 미쁘시고 의로우사 깨끗하게 용서하시는 보증입니다.",
  },
  "PSA.51.10": {
    en: "Psalm 51:10",
    ko: "시편 51:10",
    reasonEn: "David's sincere plea for a clean heart and a renewed right spirit within him.",
    reasonKo: "정한 마음을 창조하시고 정직한 영을 새롭게 해 주시기를 구하는 진솔한 간구입니다.",
  },
  "PSA.100.4-PSA.100.5": {
    en: "Psalm 100:4-5",
    ko: "시편 100:4-5",
    reasonEn: "Invites us into His gates with thanksgiving and courts with praise for His eternal mercy.",
    reasonKo: "여호와의 선하심과 영원한 인자하심을 기억하며 감사로 궁정에 나아가게 합니다.",
  },
  "1TH.5.16-1TH.5.18": {
    en: "1 Thessalonians 5:16-18",
    ko: "데살로니가전서 5:16-18",
    reasonEn: "Reminds us to rejoice always, pray without ceasing, and give thanks in all circumstances.",
    reasonKo: "항상 기뻐하고 쉬지 말고 기도하며 모든 일에 감사하라는 하나님의 뜻을 일깨웁니다.",
  },
  "1TI.2.1-1TI.2.2": {
    en: "1 Timothy 2:1-2",
    ko: "디모데전서 2:1-2",
    reasonEn: "Urges supplications, prayers, intercessions, and thanksgivings for all people.",
    reasonKo: "모든 사람과 이웃을 위하여 간구와 기도와 중보를 드리도록 권면합니다.",
  },
  "JAS.5.16": {
    en: "James 5:16",
    ko: "야고보서 5:16",
    reasonEn: "Emphasizes praying for one another, as the prayer of a righteous person has great power.",
    reasonKo: "서로를 위해 기도할 것을 권하며, 의인의 간구는 역사하는 힘이 큼을 확신합니다.",
  },
  "JOS.24.15": {
    en: "Joshua 24:15",
    ko: "여호수아 24:15",
    reasonEn: "Joshua's steadfast covenant: 'As for me and my house, we will serve the Lord.'",
    reasonKo: "오직 나와 내 집은 여호와만을 섬기겠다는 신앙적 결단의 고백입니다.",
  },
  "ISA.49.25": {
    en: "Isaiah 49:25",
    ko: "이사야 49:25",
    reasonEn: "God's comforting promise to contend with those who contend with you and save your children.",
    reasonKo: "자녀들을 구원하시며 우리와 다투는 자와 친히 다투시겠다는 주님의 약속입니다.",
  },
};

/**
 * Finds curated Scripture anchors based on prayer burden keywords and prayer type.
 * Returns references and one-sentence relevance explanations only. Zero verse text.
 */
export function findScriptureAnchors(
  burden: string,
  prayerType: PrayerType,
  locale: "en" | "ko" = "en"
): ScriptureAnchor[] {
  const matched: ScriptureAnchor[] = [];
  const lowerBurden = burden.toLowerCase();

  // 1. Topic keyword matching
  for (const topic of TOPICS) {
    const hasKeyword = topic.keywords?.some(kw => lowerBurden.includes(kw.toLowerCase()));
    if (hasKeyword) {
      for (const passageId of topic.anchorPassages) {
        const meta = PASSAGE_REFERENCE_MAP[passageId];
        if (meta && !matched.some(m => m.reference === (locale === "ko" ? meta.ko : meta.en))) {
          matched.push({
            reference: locale === "ko" ? meta.ko : meta.en,
            topicId: topic.id,
            topicTitleEn: topic.titleEn,
            topicTitleKo: topic.titleKo,
            relevanceEn: meta.reasonEn,
            relevanceKo: meta.reasonKo,
          });
        }
      }
    }
  }

  // 2. Prayer type defaults if few or no keyword matches found
  const fallbackPassageIds: Record<PrayerType, string[]> = {
    personal: ["PHP.4.6-PHP.4.7", "1PE.5.7"],
    family: ["JOS.24.15", "ISA.49.25"],
    intercessory: ["1TI.2.1-1TI.2.2", "JAS.5.16"],
    corporate: ["PSA.100.4-PSA.100.5", "1TI.2.1-1TI.2.2"],
    confession: ["1JN.1.9", "PSA.51.10"],
    thanksgiving: ["1TH.5.16-1TH.5.18", "PSA.100.4-PSA.100.5"],
  };

  const fallbacks = fallbackPassageIds[prayerType] || ["PHP.4.6-PHP.4.7", "1PE.5.7"];
  for (const passageId of fallbacks) {
    const meta = PASSAGE_REFERENCE_MAP[passageId];
    if (meta && !matched.some(m => m.reference === (locale === "ko" ? meta.ko : meta.en))) {
      matched.push({
        reference: locale === "ko" ? meta.ko : meta.en,
        topicId: "default",
        topicTitleEn: "Scripture Anchor",
        topicTitleKo: "말씀 앵커",
        relevanceEn: meta.reasonEn,
        relevanceKo: meta.reasonKo,
      });
    }
  }

  // Return top 2-3 anchors
  return matched.slice(0, 3);
}
