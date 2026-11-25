import { describe, expect, it } from 'vitest'
import { authErrorMessage } from '../features/auth/messages'
import { purposeLabel } from '../features/onboarding/purposes'
import { i18n } from '.'
import { resources } from './resources'

function leaves(value: unknown, path = ''): [string, unknown][] {
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k))
  }
  return [[path, value]]
}

describe('i18n', () => {
  it('starts in Italian with every catalog loaded synchronously', () => {
    expect(i18n.language).toBe('it')
    expect(i18n.t('actions.save')).toBe('Salva')
    expect(i18n.t('login.title.register', { ns: 'auth' })).toBe('Crea un account')
  })

  it('has no empty strings in the Italian catalogs', () => {
    const empty = leaves(resources.it).filter(([, v]) => typeof v !== 'string' || v.trim() === '')
    expect(empty).toEqual([])
  })

  it('pluralizes minutes', () => {
    expect(i18n.t('minutes', { count: 1 })).toBe('1 minuto')
    expect(i18n.t('minutes', { count: 20 })).toBe('20 minuti')
  })

  it('translates Supabase auth errors and keeps unknown ones', () => {
    expect(authErrorMessage({ message: 'Invalid login credentials' })).toBe('Email o password non corretti.')
    expect(authErrorMessage({ message: 'x', code: 'weak_password' })).toMatch(/troppo debole/)
    expect(authErrorMessage({ message: 'Something else' })).toBe('Something else')
  })

  it('labels purposes', () => {
    expect(purposeLabel('travel')).toBe('Viaggi')
    expect(purposeLabel(null)).toBe('non scelto')
  })
})
