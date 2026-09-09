import { LoadDimension } from '../../types/load';
import { DeStressAction } from '../../types/soundingBoard';

export function getRecommendedDeStressActions(primaryDimension: LoadDimension): DeStressAction[] {
  const actions: DeStressAction[] = [];

  // 1. Box Breathing Guide (universal physical/mental reset)
  actions.push({
    id: 'act-breathing',
    type: 'box_breathing',
    title: '2-Minute Box Breathing Protocol',
    durationMinutes: 2,
    instruction: 'Inhale 4s, hold 4s, exhale 4s, hold 4s. Lowers autonomic nervous system arousal.',
    payload: {
      breathingCycleSeconds: { inhale: 4, hold: 4, exhale: 4, rest: 4 },
    },
  });

  // 2. Leave / Extension Request Generator
  if (primaryDimension === 'mental' || primaryDimension === 'time') {
    actions.push({
      id: 'act-leave-academic',
      type: 'leave_script',
      title: 'Coursework Extension Draft',
      durationMinutes: 3,
      instruction: 'Objective, non-apologetic email draft requesting a 24-hour extension.',
      payload: {
        emailSubject: 'Request for 24-Hour Assignment Extension — Coursework Scheduling',
        emailBody:
          'Dear Professor,\n\nDue to an unforeseen clustering of academic lab deliverables this week, I am writing to request a brief 24-hour extension on the upcoming assignment submission.\n\nMy research outline and initial draft are already compiled. The additional window will allow me to ensure rigorous analysis and code verification.\n\nThank you for your consideration.\n\nSincerely,\nAlex',
      },
    });
  } else if (primaryDimension === 'physical' || primaryDimension === 'errands') {
    actions.push({
      id: 'act-leave-shift',
      type: 'leave_script',
      title: 'Shift Coverage / Sick Leave Request',
      durationMinutes: 2,
      instruction: 'Professional message requesting shift swap or resting sick leave.',
      payload: {
        emailSubject: 'Shift Coverage Request — Unavoidable Health Recovery',
        emailBody:
          'Hi Team,\n\nI am experiencing acute fatigue and need to take today to recover to prevent sustained health decline. I have reached out to see if someone can cover the remaining hours of my shift, and I will ensure all handoff notes are logged.\n\nThank you for your understanding.',
      },
    });
  } else {
    actions.push({
      id: 'act-leave-social',
      type: 'leave_script',
      title: 'Social Boundary "Raincheck" Script',
      durationMinutes: 1,
      instruction: 'Polite boundary-setting message to reschedule social events without guilt.',
      payload: {
        emailSubject: 'Raincheck for tonight',
        emailBody:
          'Hey! I am completely depleted after a heavy week of deadlines and need a quiet evening to recharge. Can we reschedule to next weekend? Really looking forward to catching up properly when I have energy!',
      },
    });
  }

  // 3. Grounding action
  actions.push({
    id: 'act-grounding',
    type: 'grounding',
    title: '5-4-3-2-1 Sensory Reset',
    durationMinutes: 3,
    instruction: 'Identify 5 visible objects, 4 tactile textures, 3 ambient sounds, 2 scents, and 1 slow breath.',
  });

  return actions;
}
