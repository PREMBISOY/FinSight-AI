import { useCallback, useState } from 'react'
import type { DemoUserId, LocalAccount, PublicAccount } from '../types/auth'

const ACCOUNTS_KEY = 'finsight-local-accounts-v1'
const SESSION_KEY = 'finsight-active-login-v1'

interface CreateAccountInput {
  name: string
  password: string
  demoUserId: DemoUserId
}

function accountKey(name: string): string {
  return name.trim().toLocaleLowerCase()
}

function readAccounts(): LocalAccount[] {
  try {
    const value = localStorage.getItem(ACCOUNTS_KEY)
    return value ? JSON.parse(value) : []
  } catch {
    return []
  }
}

function publicAccount(account: LocalAccount): PublicAccount {
  const { passwordHash: _passwordHash, loginId: _loginId, ...safeAccount } = account
  return safeAccount
}

async function hashPassword(key: string, password: string): Promise<string> {
  const bytes = new TextEncoder().encode(`finsight:${key.toLowerCase()}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

function initialAccount(): PublicAccount | null {
  const activeLoginId = localStorage.getItem(SESSION_KEY)
  if (!activeLoginId) return null
  const account = readAccounts().find(item => item.loginId === activeLoginId)
  return account ? publicAccount(account) : null
}

export function useAuth() {
  const [account, setAccount] = useState<PublicAccount | null>(initialAccount)

  const createAccount = useCallback(async (input: CreateAccountInput) => {
    const name = input.name.trim()
    const loginId = accountKey(name)
    const accounts = readAccounts()

    if (name.length < 2) throw new Error('Enter your full name.')
    if (input.password.length < 6) throw new Error('Password must be at least 6 characters.')
    if (accounts.some(item => accountKey(item.name) === loginId)) throw new Error('An account with that name already exists on this device.')

    const nextAccount: LocalAccount = {
      name,
      loginId,
      demoUserId: input.demoUserId,
      passwordHash: await hashPassword(loginId, input.password),
      createdAt: new Date().toISOString(),
    }
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify([...accounts, nextAccount]))
    localStorage.setItem(SESSION_KEY, loginId)
    setAccount(publicAccount(nextAccount))
  }, [])

  const signIn = useCallback(async (nameInput: string, password: string) => {
    const matchingAccount = readAccounts().find(item => accountKey(item.name) === accountKey(nameInput))
    if (!matchingAccount || matchingAccount.passwordHash !== await hashPassword(matchingAccount.loginId, password)) {
      throw new Error('Incorrect name or password.')
    }
    localStorage.setItem(SESSION_KEY, matchingAccount.loginId)
    setAccount(publicAccount(matchingAccount))
  }, [])

  const signOut = useCallback(() => {
    localStorage.removeItem(SESSION_KEY)
    setAccount(null)
  }, [])

  return { account, createAccount, signIn, signOut }
}
