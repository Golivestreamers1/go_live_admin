---
name: backend-migration
description: Checklist and API contract for pointing the Admin Dashboard at a new backend — required endpoints, expected response format, and verification steps.
---

# Backend Migration

## Backend Compatibility Requirements

When integrating with a new backend, ensure it provides:

### Required Auth Endpoints
- `POST /auth/login` with JWT tokens
- `POST /auth/refresh` for token renewal
- Role level or permission check for admin access

### Required User Endpoints
- `GET /admin/users` with pagination
- `POST /admin/users` to create
- `PUT /admin/users/:id` to update
- `DELETE /admin/users/:id` to delete
- `PATCH /admin/users/:id/reset-password` to reset

### Required Role Endpoint
- `GET /admin/roles` to fetch all roles

### Optional Dashboard Endpoints
- `GET /dashboard/stats`
- `GET /dashboard/activity`
- `GET /dashboard/metrics`

### Expected Response Format
All endpoints should return:
```json
{
  "success": boolean,
  "data": any,
  "message"?: string,
  "errors"?: Array
}
```

## Migration Checklist

1. [ ] Update API base URL in `.env` (`VITE_API_BASE_URL`)
2. [ ] Verify authentication endpoint matches (`/auth/login`)
3. [ ] Check token response structure
4. [ ] Verify user object structure (especially `role` field)
5. [ ] Update all service functions if endpoint paths changed
6. [ ] Test token refresh flow
7. [ ] Verify pagination format matches expected structure
8. [ ] Test role-based access control
9. [ ] Update any hardcoded role names if changed
10. [ ] Test all CRUD operations (create, read, update, delete)
11. [ ] Verify error response format
12. [ ] Update toast messages if needed
13. [ ] Test form validation matches backend requirements
14. [ ] Run full manual test of all features
