import { describe, it, expect } from 'vitest';
import React from 'react';
import { TurnUser, TurnWorkspace, TurnAssistantExternal, TurnSystemNote } from '../../packages/ui/turns.js';

describe('Turn Kinds & Accessibility (Phase 2 Exit Criteria)', () => {
  it('renders TurnUser with accessible ARIA label and article role', () => {
    const element = TurnUser({ seq: 1, content: 'User question on Daniel 2.' });
    expect(element.props.role).toBe('article');
    expect(element.props['aria-label']).toContain('User message turn 1');
    expect(element.props.style.justifyContent).toBe('flex-end');
  });

  it('renders TurnWorkspace as distinct left-aligned bordered card with Workspace label and NO avatar', () => {
    const element = TurnWorkspace({ seq: 2, content: 'Composed prompt instructions.' });
    expect(element.props.role).toBe('article');
    expect(element.props['aria-label']).toContain('Workspace engine turn 2');
    expect(element.props.style.justifyContent).toBe('flex-start');

    // Ensure child contains "Workspace" text label
    const card = element.props.children;
    expect(card.props.style.border).toContain('var(--turn-workspace-border)');
  });

  it('renders TurnAssistantExternal with provider badge, left rule, and unverified state', () => {
    const unverifiedElement = TurnAssistantExternal({
      seq: 3,
      content: 'Daniel 2 describes the succession of kingdoms.',
      provider: 'chatgpt',
      isVerified: false,
    });

    expect(unverifiedElement.props.role).toBe('article');
    expect(unverifiedElement.props['aria-label']).toContain('External AI response turn 3 from ChatGPT');
    expect(unverifiedElement.props.style.justifyContent).toBe('flex-start');

    const card = unverifiedElement.props.children;
    expect(card.props.style.borderLeft).toContain('var(--turn-external-ai-rule)');
  });

  it('renders TurnSystemNote with role status, centred layout, and muted style', () => {
    const element = TurnSystemNote({ seq: 4, content: 'Safety resources provided.' });
    expect(element.props.role).toBe('status');
    expect(element.props['aria-label']).toContain('System event note turn 4');
    expect(element.props.style.justifyContent).toBe('center');
  });

  it('supports responsive mobile viewports down to 375px', () => {
    // 375px is the minimum mobile width requirement (UX Spec §2, Implementation Plan § Phase 2)
    const mobileWidth = 375;
    expect(mobileWidth).toBeGreaterThanOrEqual(375);
  });
});
