export const getAuthErrorMessage = (errorCode?: string): string => {
  const messages: Record<string, string> = {
    'auth/invalid-email': 'Invalid email address',
    'auth/user-disabled': 'This account has been disabled',
    'auth/user-not-found': 'User account not found',
    'auth/wrong-password': 'Incorrect password',
    'auth/too-many-requests': 'Too many login attempts. Please try again later',
    'auth/invalid-credential': 'Invalid email or password'
  }

  return messages[errorCode ?? ''] || 'Login failed. Please try again.'
}