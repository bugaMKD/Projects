export interface DeliveryCapacity {
  seCodingCapacityStoryPoints: number;
  qaTestingCapacityStoryPoints: number;
  deliverableStoryPoints: number;
  scopeStoryPoints: number;
  constrainedBy: 'SE' | 'QA' | 'Scope' | 'SE and QA';
}
