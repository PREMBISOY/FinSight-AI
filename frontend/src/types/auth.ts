export type DemoUserId = 'conservative-demo' | 'aggressive-demo'

export interface LocalAccount {
  name: string
  loginId: string
  demoUserId: DemoUserId
  passwordHash: string
  createdAt: string
}

export type PublicAccount = Omit<LocalAccount, 'passwordHash' | 'loginId'>
