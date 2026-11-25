import { i18n } from '../../i18n'

/** Message in the interface language for a Supabase auth error (the library's own messages are in English). */
export function authErrorMessage(error: { message: string; code?: string }): string {
  const t = i18n.getFixedT(null, 'auth')
  const text = error.message.toLowerCase()
  if (error.code === 'invalid_credentials' || text.includes('invalid login credentials')) {
    return t('errors.invalidCredentials')
  }
  if (error.code === 'user_already_exists' || text.includes('already registered')) return t('errors.userExists')
  if (error.code === 'weak_password' || text.includes('password should be')) return t('errors.weakPassword')
  if (error.code === 'same_password' || text.includes('different from the old')) return t('errors.samePassword')
  if (error.code === 'over_email_send_rate_limit' || text.includes('rate limit')) return t('errors.rateLimit')
  if (error.code === 'signup_disabled') return t('errors.signupDisabled')
  return error.message
}
