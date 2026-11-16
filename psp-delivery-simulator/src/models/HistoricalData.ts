/** SE and QA effective days refer to the *same historical delivered scope*. */
export interface HistoricalData {
  deliveredStoryPoints: number;
  seEffectiveDays: number;
  qaEffectiveDays: number;
}
export interface HistoricalProductivity {
  seStoryPointsPerEffectiveDay: number;
  qaStoryPointsPerEffectiveDay: number;
  historicalSeToQaEffectiveDayRatio: number;
}
