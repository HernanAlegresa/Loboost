'use server'

import { createPlanAction, type CreatePlanState } from '@/features/plans/actions/create-plan'
import { updatePlanFullAction, type UpdatePlanFullState } from '@/features/plans/actions/update-plan-full'

export type PlanBuilderSubmitState =
  | { success: true; planId: string }
  | { success: false; error: string }
  | null

export async function submitPlanBuilderAction(
  _prev: PlanBuilderSubmitState,
  formData: FormData
): Promise<PlanBuilderSubmitState> {
  const mode = formData.get('builderMode')
  if (mode === 'edit') {
    return updatePlanFullAction(_prev as UpdatePlanFullState, formData)
  }
  return createPlanAction(_prev as CreatePlanState, formData)
}
