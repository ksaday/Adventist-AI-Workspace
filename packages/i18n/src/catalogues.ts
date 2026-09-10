/**
 * ICU Message Catalogues for SDA AI Workspace (Phase 2).
 * Supports English ('en') and Korean ('ko').
 */

export const CATALOGUES = {
  en: {
    app_title: 'SDA AI Workspace',
    new_chat: '+ New Chat',
    tools_header: 'TOOLS',
    tool_prayer_note: 'Prayer Note',
    tool_spiritual_guidance: 'Spiritual Guidance',
    tool_pastor_aids: 'Pastor’s Aids',
    recent_header: 'RECENT',
    search_placeholder: 'Search conversations…',
    settings: 'Settings',
    ask_placeholder: 'Ask about anything…',
    compose_button: 'Compose →',
    language_indicator: '{locale} detected',
    mode_standard: 'Standard',
    mode_ephemeral: 'Ephemeral',
    make_ephemeral: 'Make ephemeral',
    turn_user_label: 'You',
    turn_workspace_label: 'Workspace',
    turn_external_ai_label: 'External AI ({provider})',
    turn_system_note_label: 'System Note',
    waiting_card_title: 'Waiting for your answer',
    copy_and_open: 'Copy & open {provider}',
    paste_answer: 'Paste the answer ▾',
  },
  ko: {
    app_title: '재림교회 AI 워크스페이스',
    new_chat: '+ 새 대화',
    tools_header: '도구',
    tool_prayer_note: '기도 노트',
    tool_spiritual_guidance: '영적 지도',
    tool_pastor_aids: '목회자 지원',
    recent_header: '최근 대화',
    search_placeholder: '대화 검색…',
    settings: '설정',
    ask_placeholder: '무엇이든 질문하세요…',
    compose_button: '프롬프트 작성 →',
    language_indicator: '{locale} 감지됨',
    mode_standard: '표준 모드',
    mode_ephemeral: '임시(에페머럴) 모드',
    make_ephemeral: '임시 모드로 전환',
    turn_user_label: '사용자',
    turn_workspace_label: '워크스페이스',
    turn_external_ai_label: '외부 AI ({provider})',
    turn_system_note_label: '시스템 알림',
    waiting_card_title: '답변을 기다리는 중입니다',
    copy_and_open: '{provider} 복사 및 열기',
    paste_answer: '답변 붙여넣기 ▾',
  },
} as const;

export type TranslationKey = keyof typeof CATALOGUES.en;
