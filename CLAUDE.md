# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the Admin Dashboard project.

## Project Overview

Admin Dashboard (React 18 + Vite) for managing users, viewing analytics, and system administration. Works against a separate backend API and uses role-based access control (RBAC): only users with role level 3+ (or the `admin_dashboard` permission) may access it.

## Authentication & Authorization

### Auth Flow
1. User logs in via `/login` with email/username and password
2. Backend validates and returns JWT tokens + user object
3. Only users with `role.level >= 3` OR `admin_dashboard` permission can access
4. Tokens stored in localStorage with `admin` prefix to avoid conflicts with the main app
5. Automatic token refresh via axios interceptors on 401 errors

### Local Storage Keys
- `adminAccessToken` - JWT access token (1h expiry)
- `adminRefreshToken` - JWT refresh token (7d expiry)
- `adminUser` - Serialized user object with role information

If you rename these keys, update every occurrence in `src/App.jsx`, `src/services/api.js`, `src/components/AdminLoginForm.jsx`, and `src/components/AdminLayout.jsx`.

### Role Levels
- **Level 5**: Super Admin (full access)
- **Level 4**: Admin (user management)
- **Level 3**: Staff (can create/edit users below their level)
- **Level 2**: User (no admin access)
- **Level 1**: Guest (no admin access)

A user may only manage users whose role level is strictly below their own.

## Known Limitations

1. **Settings page** is a placeholder with no functionality
2. **Dashboard metrics** may show dummy data if backend doesn't provide real metrics
3. **No real-time updates** - requires manual refresh
4. **No bulk operations** - users must be edited one at a time
5. **No role management UI** - roles are read-only from backend

## Backend Migration

When integrating a new backend, use the `backend-migration` skill (`.claude/skills/backend-migration/SKILL.md`) — it documents the required endpoints, expected response format, and the full migration checklist.
