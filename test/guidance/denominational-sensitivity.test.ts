import { describe, it, expect } from 'vitest';
import {
  detectDenominationalTopics,
  buildDenominationalClause,
  DENOMINATIONAL_TOPICS,
} from '../../packages/guidance/src/sensitivity';

describe('Denominational Sensitivity Detection and Clause (Phase 5 / PR-P3-06)', () => {
  it('covers all 12 sensitive doctrinal topics from Template Library §5.2', () => {
    expect(DENOMINATIONAL_TOPICS.length).toBe(12);
    const topicIds = DENOMINATIONAL_TOPICS.map(t => t.id);
    expect(topicIds).toContain('sabbath');
    expect(topicIds).toContain('sanctuary');
    expect(topicIds).toContain('state_of_the_dead');
    expect(topicIds).toContain('spirit_of_prophecy');
    expect(topicIds).toContain('health_message');
    expect(topicIds).toContain('last_day_events');
    expect(topicIds).toContain('standards_and_lifestyle');
    expect(topicIds).toContain('investigative_judgement');
    expect(topicIds).toContain('creation');
    expect(topicIds).toContain('tithe');
    expect(topicIds).toContain('marriage_divorce');
    expect(topicIds).toContain('womens_ordination');
  });

  it('detects sensitive topics in English questions', () => {
    const q1 = 'How should I understand sabbath keeping when traveling for work?';
    const topics1 = detectDenominationalTopics(q1);
    expect(topics1.some(t => t.id === 'sabbath')).toBe(true);

    const q2 = 'What happens to the soul at death according to the Bible?';
    const topics2 = detectDenominationalTopics(q2);
    expect(topics2.some(t => t.id === 'state_of_the_dead')).toBe(true);

    const q3 = 'Is the investigative judgment in 1844 supported by Daniel 8:14?';
    const topics3 = detectDenominationalTopics(q3);
    expect(topics3.some(t => t.id === 'investigative_judgement')).toBe(true);
    expect(topics3.some(t => t.id === 'sanctuary')).toBe(true);
  });

  it('detects sensitive topics in Korean questions', () => {
    const q1 = '안식일에 식당을 이용하는 것에 대해 재림교회는 어떻게 가르치나요?';
    const topics1 = detectDenominationalTopics(q1);
    expect(topics1.some(t => t.id === 'sabbath')).toBe(true);

    const q2 = '영혼불멸설과 지옥에 대한 성경적 가르침이 궁금합니다.';
    const topics2 = detectDenominationalTopics(q2);
    expect(topics2.some(t => t.id === 'state_of_the_dead')).toBe(true);

    const q3 = '화잇 선지자의 예언의 신 저작 권위는 성경과 비교해 어떤가요?';
    const topics3 = detectDenominationalTopics(q3);
    expect(topics3.some(t => t.id === 'spirit_of_prophecy')).toBe(true);

    const q4 = '여성 안수 문제와 목사 안수에 관한 교단의 결정은 무엇인가요?';
    const topics4 = detectDenominationalTopics(q4);
    expect(topics4.some(t => t.id === 'womens_ordination')).toBe(true);
  });

  it('generates the denominational sensitivity clause directing pastoral rulings to the local pastor', () => {
    const detected = detectDenominationalTopics('sabbath keeping');
    const clauseEn = buildDenominationalClause(detected, 'en');

    expect(clauseEn).toContain('DENOMINATIONAL SENSITIVITY CLAUSE:');
    expect(clauseEn).toContain('Seventh-day Adventist Church holds a specific position');
    expect(clauseEn).toContain('Represent that position accurately');
    expect(clauseEn).toContain('direct them to their local pastor');

    const clauseKo = buildDenominationalClause(detected, 'ko');
    expect(clauseKo).toContain('DENOMINATIONAL SENSITIVITY CLAUSE:');
    expect(clauseKo).toContain('제칠일안식일예수재림교회가 특정한 입장을 견지하고 있는');
    expect(clauseKo).toContain('출석 교회의 담임목사님과 상담하도록');
  });

  it('returns empty string when no sensitive topics are detected', () => {
    const topics = detectDenominationalTopics('How can I have more peace and joy during hard times?');
    expect(topics.length).toBe(0);
    expect(buildDenominationalClause(topics, 'en')).toBe('');
    expect(buildDenominationalClause(topics, 'ko')).toBe('');
  });
});
