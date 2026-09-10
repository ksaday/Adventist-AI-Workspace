/**
 * Prayer Note Structural Frame & Pastoral Framing.
 *
 * Implements:
 * - PR-P2-02, PR-P2-03, PR-P2-09
 * - Template Library §4.1
 * - Critical Review C-03 (Matthew 6:7 warning against formalism)
 */

import { PrayerComponent, PrayerComponentId } from "./types.js";

export const PRAYER_FRAME_DISCLAIMER_EN =
  "This is one helpful pattern, not a required formula. Scripture presents prayer as relationship with God, who hears simple, honest words (Matthew 6:7).";

export const PRAYER_FRAME_DISCLAIMER_KO =
  "이 구조는 하나의 유익한 안내일 뿐, 결코 정해진 공식이나 율법이 아닙니다. 성경은 기도를 기술이나 반복적 형식이 아닌 하나님과의 진솔한 인격적 관계(마태복음 6:7)로 제시합니다.";

export const DEFAULT_PRAYER_COMPONENTS: PrayerComponent[] = [
  {
    id: "address",
    nameEn: "Address to God",
    nameKo: "하나님을 부름",
    scriptureBasis: "Matthew 6:9",
    promptGuideEn: "Call upon God as our loving Heavenly Father",
    promptGuideKo: "사랑 많으신 하늘 아버지로 하나님을 부릅니다",
    enabled: true,
  },
  {
    id: "praise",
    nameEn: "Praise & Adoration",
    nameKo: "찬양과 경배",
    scriptureBasis: "Psalm 100:4, Matthew 6:9",
    promptGuideEn: "Praise God for His holiness, majesty and unchanging character",
    promptGuideKo: "하나님의 거룩하심과 변함없는 성품을 찬양합니다",
    enabled: false,
  },
  {
    id: "thanksgiving",
    nameEn: "Thanksgiving",
    nameKo: "감사",
    scriptureBasis: "1 Thessalonians 5:18, Philippians 4:6",
    promptGuideEn: "Thank God for specific mercies, answers to prayer and daily grace",
    promptGuideKo: "베풀어 주신 은혜와 기도의 응답에 감사드립니다",
    enabled: true,
  },
  {
    id: "confession",
    nameEn: "Confession",
    nameKo: "고백과 회개",
    scriptureBasis: "1 John 1:9, Matthew 6:12",
    promptGuideEn: "Honestly confess shortcomings, anxieties, and need of cleansing",
    promptGuideKo: "우리의 연약함과 허물, 불안을 정직히 고백합니다",
    enabled: true,
  },
  {
    id: "petition",
    nameEn: "Petition",
    nameKo: "간구",
    scriptureBasis: "Matthew 6:11, Philippians 4:6",
    promptGuideEn: "Present personal needs, daily strength, and spiritual burdens",
    promptGuideKo: "우리의 필요와 마음에 짊어진 짐을 솔직히 아룁니다",
    enabled: true,
  },
  {
    id: "intercession",
    nameEn: "Intercession",
    nameKo: "중보 기도",
    scriptureBasis: "1 Timothy 2:1, Ephesians 6:18",
    promptGuideEn: "Pray for family, friends, the church, and those in distress",
    promptGuideKo: "가족과 이웃, 교회와 고난받는 이들을 위해 기도합니다",
    enabled: true,
  },
  {
    id: "submission",
    nameEn: "Submission to God's Will",
    nameKo: "주님의 뜻에 순종",
    scriptureBasis: "Matthew 6:10, Luke 22:42",
    promptGuideEn: "Surrender outcomes to God's perfect wisdom and timing",
    promptGuideKo: "우리의 뜻이 아닌 하나님의 선하신 섭리에 맡겨드립니다",
    enabled: true,
  },
  {
    id: "closing",
    nameEn: "Closing",
    nameKo: "예수님의 이름으로 맺음",
    scriptureBasis: "John 14:13",
    promptGuideEn: "Close with faith and confidence in the name of Jesus Christ",
    promptGuideKo: "예수 그리스도의 이름으로 믿음과 신뢰 가운데 마칩니다",
    enabled: true,
  },
];

export function getDefaultComponentIds(): PrayerComponentId[] {
  return DEFAULT_PRAYER_COMPONENTS.filter(c => c.enabled).map(c => c.id);
}

export function reorderComponents(
  current: PrayerComponentId[],
  fromIndex: number,
  toIndex: number
): PrayerComponentId[] {
  const result = [...current];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  return result;
}

export function toggleComponent(
  current: PrayerComponentId[],
  id: PrayerComponentId
): PrayerComponentId[] {
  if (current.includes(id)) {
    return current.filter(c => c !== id);
  } else {
    return [...current, id];
  }
}
