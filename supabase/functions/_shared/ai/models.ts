import { requireEnv } from '../env.ts'
import type { AiTask } from './types.ts'

/**
 * Cheap model for exercises and corrections, more capable one for dialogues and
 * explanations. Model ids come from the environment, never from code.
 */
export function modelForTask(task: AiTask): string {
  switch (task) {
    case 'exercise':
    case 'correction':
      return requireEnv('AI_MODEL_FAST')
    case 'dialogue':
    case 'explanation':
      return requireEnv('AI_MODEL_SMART')
  }
}
