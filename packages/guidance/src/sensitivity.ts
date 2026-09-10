/**
 * Denominational Sensitivity Detection and Clause Generator (PR-P3-06 / Template Library §5.1-§5.2).
 *
 * Covers the 12 sensitive doctrinal/pastoral topics:
 * 1. Sabbath
 * 2. The Sanctuary
 * 3. State of the Dead
 * 4. Spirit of Prophecy
 * 5. Health Message
 * 6. Last-Day Events
 * 7. Standards and Lifestyle
 * 8. Investigative Judgement
 * 9. Creation
 * 10. Tithe
 * 11. Marriage, Divorce and Remarriage
 * 12. Women's Ordination
 */

import type { DenominationalTopic, DenominationalTopicId } from './types';

export const DENOMINATIONAL_TOPICS: DenominationalTopic[] = [
  {
    id: 'sabbath',
    nameEn: 'the Sabbath',
    nameKo: '안식일',
    keywordsEn: ['sabbath', 'seventh day', 'saturday worship', 'sabbath keeping', 'lord\'s day', 'sunday sacredness'],
    keywordsKo: ['안식일', '제칠일', '토요일 예배', '안식일 준수', '주일 성수', '일요일'],
    officialPositionEn: 'The Seventh-day Sabbath is the memorial of Creation and a sign of loyalty to God.',
    officialPositionKo: '제칠일 안식일은 창조의 기념일이자 하나님께 대한 충성의 표입니다.',
  },
  {
    id: 'sanctuary',
    nameEn: 'the heavenly sanctuary',
    nameKo: '하늘 성소',
    keywordsEn: ['sanctuary', 'heavenly sanctuary', 'cleansing of the sanctuary', 'most holy place', 'high priest', '2300 days', 'daniel 8:14'],
    keywordsKo: ['성소', '하늘 성소', '성소 정결', '지성소', '대제사장', '2300주야', '다니엘 8:14'],
    officialPositionEn: 'Christ ministers in the heavenly sanctuary for our redemption.',
    officialPositionKo: '그리스도께서는 우리의 구속을 위하여 하늘 지성소에서 봉사하십니다.',
  },
  {
    id: 'state_of_the_dead',
    nameEn: 'the state of the dead',
    nameKo: '죽은 자의 상태',
    keywordsEn: ['state of the dead', 'soul sleep', 'immortality of the soul', 'hell', 'eternal torment', 'afterlife', 'death', 'resurrection'],
    keywordsKo: ['죽은 자의 상태', '영혼 수면', '영혼 불멸', '지옥', '영원한 지옥', '사후세계', '죽음', '부활'],
    officialPositionEn: 'Death is an unconscious sleep until the resurrection at the Second Coming of Christ.',
    officialPositionKo: '죽음은 그리스도의 재림 시 부활 때까지 무의식적인 잠입니다.',
  },
  {
    id: 'spirit_of_prophecy',
    nameEn: 'the Spirit of Prophecy',
    nameKo: '예언의 신',
    keywordsEn: ['spirit of prophecy', 'ellen white', 'ellen g. white', 'prophetess', 'lesser light'],
    keywordsKo: ['예언의 신', '엘렌 화잇', '화잇 부인', '화잇 선지자', '선지자', '작은 빛'],
    officialPositionEn: 'The gift of prophecy was manifested in the life and ministry of Ellen G. White.',
    officialPositionKo: '예언의 은사는 엘렌 G. 화잇의 생애와 봉사를 통해 나타났습니다.',
  },
  {
    id: 'health_message',
    nameEn: 'the health message',
    nameKo: '건강 기별',
    keywordsEn: ['health message', 'clean and unclean', 'vegetarianism', 'diet', 'alcohol', 'tobacco', 'temperance'],
    keywordsKo: ['건강 기별', '정결한 음식', '부정한 고기', '채식', '식생활', '음주', '술', '담배', '절제'],
    officialPositionEn: 'Our bodies are temples of the Holy Spirit, calling for healthful living and temperance.',
    officialPositionKo: '우리의 몸은 성령의 전이므로 건강한 생활과 절제를 지켜야 합니다.',
  },
  {
    id: 'last_day_events',
    nameEn: 'last-day events and prophecy',
    nameKo: '마지막 때의 사건들과 예언',
    keywordsEn: ['last-day events', 'mark of the beast', 'sunday law', 'time of trouble', 'three angels', 'remnant', 'apocalypse', 'second coming'],
    keywordsKo: ['마지막 때', '종말의 사건들', '짐승의 표', '일요일 휴업령', '환난', '세 천사의 기별', '남은 무리', '재림'],
    officialPositionEn: 'Biblical prophecy foretells final crisis events before the glorious Second Coming of Christ.',
    officialPositionKo: '성경의 예언은 그리스도의 영광스러운 재림 직전의 최종 위기 사건들을 예고합니다.',
  },
  {
    id: 'standards_and_lifestyle',
    nameEn: 'Christian standards and lifestyle',
    nameKo: '그리스도인의 생활 표준',
    keywordsEn: ['christian standards', 'lifestyle', 'jewelry', 'dress reform', 'theater', 'entertainment', 'modesty'],
    keywordsKo: ['그리스도인의 표준', '생활 표준', '보석', '패물', '의복 개혁', '세속적 오락', '단장'],
    officialPositionEn: 'Christians are called to simplicity, modesty, and purity in dress and conduct.',
    officialPositionKo: '그리스도인은 의복과 행동에서 단순함, 단정함, 순결함을 추구해야 합니다.',
  },
  {
    id: 'investigative_judgement',
    nameEn: 'the investigative judgment',
    nameKo: '조사심판',
    keywordsEn: ['investigative judgment', 'pre-advent judgment', '1844', 'daniel 8:14', 'daniel 7', 'judgment hour'],
    keywordsKo: ['조사심판', '재림 전 심판', '1844년', '다니엘 8:14', '심판의 시간'],
    officialPositionEn: 'The pre-Advent judgment began in 1844 at the end of the 2,300 prophetic days.',
    officialPositionKo: '재림 전 심판은 2300주야 끝인 1844년에 시작되었습니다.',
  },
  {
    id: 'creation',
    nameEn: 'literal creation',
    nameKo: '창조론',
    keywordsEn: ['creation', 'literal 6 days', 'six days', 'evolution', 'theistic evolution', 'young earth'],
    keywordsKo: ['창조', '6일 창조', '문자적 6일', '진화론', '유신진화론', '창조론'],
    officialPositionEn: 'God is the Creator of all things in six literal days and rested on the seventh day.',
    officialPositionKo: '하나님께서는 엿새 동안 문자적 날들로 만물을 창조하시고 제칠일에 안식하셨습니다.',
  },
  {
    id: 'tithe',
    nameEn: 'tithes and offerings',
    nameKo: '십일조와 헌금',
    keywordsEn: ['tithe', 'tithing', 'offerings', 'storehouse', 'malachi 3', 'stewardship'],
    keywordsKo: ['십일조', '십일조 헌금', '온전한 십일조', '창고', '말라기 3장', '청지기 직분'],
    officialPositionEn: 'Tithe is holy unto the Lord and dedicated to supporting the gospel ministry.',
    officialPositionKo: '십일조는 주께 속한 거룩한 것이며 복음 사역을 지원하는 데 바쳐집니다.',
  },
  {
    id: 'marriage_divorce',
    nameEn: 'marriage, divorce, and remarriage',
    nameKo: '결혼, 이혼, 그리고 재혼',
    keywordsEn: ['marriage', 'divorce', 'remarriage', 'adultery', 'separation', 'unfaithfulness'],
    keywordsKo: ['결혼', '이혼', '재혼', '간음', '별거', '부정'],
    officialPositionEn: 'Marriage is an intimate, lifelong covenant established by God at creation.',
    officialPositionKo: '결혼은 창조 시 하나님께서 제정하신 친밀하고 평생 지속되는 언약입니다.',
  },
  {
    id: 'womens_ordination',
    nameEn: "women's ordination",
    nameKo: '여성 목사 안수',
    keywordsEn: ['women\'s ordination', 'ordination of women', 'female elders', 'headship', 'pastoral ordination'],
    keywordsKo: ['여성 안수', '여성 목사 안수', '여장로 안수', '머리됨'],
    officialPositionEn: 'The General Conference Session has voted not to permit divisions to make provisions for women’s pastoral ordination.',
    officialPositionKo: '대총회 총회는 각 지회가 여성 목사 안수를 결정하도록 허용하지 않기로 결의하였습니다.',
  },
];

/**
 * Detects any denominational topics mentioned in question or source text.
 */
export function detectDenominationalTopics(text: string): DenominationalTopic[] {
  const lower = text.toLowerCase();
  const detected: DenominationalTopic[] = [];

  for (const topic of DENOMINATIONAL_TOPICS) {
    const matchedEn = topic.keywordsEn.some(kw => lower.includes(kw.toLowerCase()));
    const matchedKo = topic.keywordsKo.some(kw => lower.includes(kw.toLowerCase()));

    if (matchedEn || matchedKo) {
      detected.push(topic);
    }
  }

  return detected;
}

/**
 * Generates the denominational sensitivity clause for prompt injection (PR-P3-06 / Template Library §5.1).
 */
export function buildDenominationalClause(topics: DenominationalTopic[], locale: 'en' | 'ko'): string {
  if (topics.length === 0) {
    return '';
  }

  const topicNames = locale === 'ko'
    ? topics.map(t => t.nameKo).join(', ')
    : topics.map(t => t.nameEn).join(', ');

  if (locale === 'ko') {
    return (
      `DENOMINATIONAL SENSITIVITY CLAUSE:\n` +
      `이 질문은 제칠일안식일예수재림교회가 특정한 입장을 견지하고 있는 ${topicNames}에 관한 것입니다. ` +
      `교단의 공식적인 가르침을 정확하게 제시하십시오. ` +
      `교단의 공식 가르침과 교단 내에서 신실한 성도들 사이에 존재하는 다양한 견해의 스펙트럼, 그리고 귀하의 사견을 명확히 구별하여 설명하십시오. ` +
      `질문자의 구체적인 상황에 대한 목회적 지도와 최종 판단은 반드시 출석 교회의 담임목사님과 상담하도록 안내하십시오.`
    );
  }

  return (
    `DENOMINATIONAL SENSITIVITY CLAUSE:\n` +
    `This touches ${topicNames}, on which the Seventh-day Adventist Church holds a specific position. ` +
    `Represent that position accurately. Distinguish clearly between the denomination's teaching, ` +
    `the range of views held sincerely within it, and your own reasoning. ` +
    `For a pastoral ruling on their particular circumstances, direct them to their local pastor.`
  );
}
