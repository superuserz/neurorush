export interface ComboReward {
  coins: number;
  scoreMultiplier: number;
  label: string;
}

const COMBO_THRESHOLDS: Array<{ min: number; reward: ComboReward }> = [
  { min: 3,  reward: { coins: 5,  scoreMultiplier: 1.5, label: 'NICE!' } },
  { min: 5,  reward: { coins: 10, scoreMultiplier: 2.0, label: 'GREAT!' } },
  { min: 8,  reward: { coins: 20, scoreMultiplier: 3.0, label: 'AWESOME!' } },
  { min: 12, reward: { coins: 40, scoreMultiplier: 4.0, label: 'INSANE!' } },
  { min: 20, reward: { coins: 80, scoreMultiplier: 5.0, label: 'UNSTOPPABLE!' } },
];

export function getComboReward(combo: number): ComboReward | null {
  const tier = [...COMBO_THRESHOLDS].reverse().find((t) => combo >= t.min);
  return tier?.reward ?? null;
}

export function getScoreForCorrectAnswer(
  round: number,
  timeRemaining: number,
  totalTime: number,
  combo: number
): number {
  const base = 100;
  const timeBonus = Math.floor((timeRemaining / totalTime) * 50);
  const roundBonus = round * 10;
  const comboMultiplier = getComboReward(combo)?.scoreMultiplier ?? 1;
  return Math.floor((base + timeBonus + roundBonus) * comboMultiplier);
}
