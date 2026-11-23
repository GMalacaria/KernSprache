/** Italian message for a Supabase auth error (the library's own messages are in English). */
export function authErrorMessage(error: { message: string; code?: string }): string {
  const text = error.message.toLowerCase()
  if (error.code === 'invalid_credentials' || text.includes('invalid login credentials')) {
    return 'Email o password non corretti.'
  }
  if (error.code === 'user_already_exists' || text.includes('already registered')) {
    return 'Esiste già un account con questa email: accedi, oppure usa "Password dimenticata?".'
  }
  if (error.code === 'weak_password' || text.includes('password should be')) {
    return 'La password è troppo debole: usa almeno 8 caratteri.'
  }
  if (error.code === 'same_password' || text.includes('different from the old')) {
    return 'La nuova password deve essere diversa da quella attuale.'
  }
  if (error.code === 'over_email_send_rate_limit' || text.includes('rate limit')) {
    return "Troppi invii di email: riprova tra un'ora."
  }
  if (error.code === 'signup_disabled') return 'Le registrazioni sono chiuse.'
  return error.message
}
