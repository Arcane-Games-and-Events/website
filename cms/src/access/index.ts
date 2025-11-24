import type { Access, FieldAccess } from 'payload'

// Type for user with role
type User = {
  id: string
  role: 'admin' | 'editor' | 'writer'
}

// Helper to check if user has specific role(s)
export const hasRole = (user: User | undefined | null, roles: string[]): boolean => {
  return user ? roles.includes(user.role) : false
}

// Check if user is admin
export const isAdmin: Access = ({ req: { user } }) => {
  return hasRole(user as User, ['admin'])
}

// Check if user is editor or admin
export const isEditorOrAdmin: Access = ({ req: { user } }) => {
  return hasRole(user as User, ['editor', 'admin'])
}

// Check if user is writer, editor, or admin (any authenticated user)
export const isAuthenticated: Access = ({ req: { user } }) => {
  return Boolean(user)
}

// For collection access: Admin/Editor see all, Writers see only their own
export const isAdminEditorOrSelf: Access = ({ req: { user } }) => {
  if (!user) return false

  // Admin and Editor can see everything
  if (hasRole(user as User, ['admin', 'editor'])) {
    return true
  }

  // Writers can only see their own documents
  return {
    createdBy: {
      equals: user.id,
    }
  }
}

// Field-level: Prevent writers from publishing
export const canPublish: FieldAccess = ({ req: { user } }) => {
  if (!user) return false

  // Admin and Editor can publish
  if (hasRole(user as User, ['admin', 'editor'])) {
    return true
  }

  // Writers cannot publish - this will hide the publish button
  return false
}
