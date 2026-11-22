// Single place for third-party versions used by Edge Functions.
export { default as Anthropic } from 'npm:@anthropic-ai/sdk@1.12.0'
export { betaZodOutputFormat } from 'npm:@anthropic-ai/sdk@1.12.0/helpers/beta/zod'
export { z } from 'npm:zod@4.6.7'
export { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.119.2'
export {
  ApiError as GeminiApiError,
  type Content as GeminiContent,
  GoogleGenAI,
  ThinkingLevel,
} from 'npm:@google/genai@3.6.1'
