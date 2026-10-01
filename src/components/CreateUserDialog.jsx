import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  User,
  Mail,
  Key,
  Eye,
  EyeOff,
  Loader2,
  X,
  UserPlus,
  Gift,
} from 'lucide-react';
import { userService } from '../services/userService';
import { iconRecruiterService } from '../services/iconRecruiterService';
import api from '../services/api';
import { isFullAdmin } from '../lib/adminAccess';
import { toast } from 'sonner';

const SIGNUP_EMAIL_REGEX =
  /^[a-z0-9](?:[a-z0-9._%+-]*[a-z0-9])?@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i;

export const CreateUserDialog = ({
  isOpen,
  onClose,
  onUserCreated,
  variant = 'default',
}) => {
  const isIconRecruiterRegister = variant === 'icon-recruiter-verified';
  const isAdminUserCreation = variant === 'admin-user';
  const canAssignRoles = isFullAdmin(JSON.parse(localStorage.getItem('adminUser') || '{}'));
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    referralCode: '',
    roleId: 'user',
    adminPermissions: [],
  });
  const [permissionPages, setPermissionPages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        referralCode: '',
        roleId: 'user',
        adminPermissions: [],
      });
      setErrors({});
      setShowPassword(false);
      setShowConfirmPassword(false);
      if (isAdminUserCreation) {
        api.get('/admin/roles/permissions')
          .then((response) => setPermissionPages(response.data.data?.pages || []))
          .catch((error) => toast.error(error.response?.data?.message || 'Failed to load page permissions'));
      }
    }
  }, [isOpen, isAdminUserCreation]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const name = formData.name.trim();
    const email = formData.email.trim().toLowerCase();

    if (!name) newErrors.name = 'Name is required';
    if (!email) newErrors.email = 'Email is required';
    else if (!SIGNUP_EMAIL_REGEX.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm the password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    if (isAdminUserCreation && canAssignRoles && formData.roleId === 'staff' && !formData.adminPermissions.length) {
      newErrors.adminPermissions = 'Select at least one page for this staff account';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setLoading(true);
      const result = isIconRecruiterRegister
        ? await iconRecruiterService.registerVerifiedUser({
            name: formData.name.trim(),
            email: formData.email.trim(),
            password: formData.password,
            referralCode: formData.referralCode,
          })
        : isAdminUserCreation
          ? await userService.createUser({
              firstName: formData.name.trim(),
              email: formData.email.trim(),
              password: formData.password,
              roleId: canAssignRoles ? formData.roleId : 'user',
              ...(canAssignRoles && formData.roleId === 'staff'
                ? { adminPermissions: formData.adminPermissions }
                : {}),
            })
        : await userService.registerUser({
            name: formData.name.trim(),
            email: formData.email.trim(),
            password: formData.password,
            referralCode: formData.referralCode,
          });

      toast.success(
        (isAdminUserCreation ? 'User created successfully' : result.message) ||
          (isIconRecruiterRegister
            ? 'User registered and verified'
            : 'User registered successfully')
      );
      if (!isIconRecruiterRegister && !isAdminUserCreation) {
        toast.info('Verification OTP has been sent to the user email.', {
          duration: 8000,
        });
      } else if (isIconRecruiterRegister) {
        toast.info(
          'User is verified. Recruiters can invite them within 48 hours.',
          { duration: 8000 }
        );
      }

      const createdUser = isAdminUserCreation ? result.user : result.data;
      if (onUserCreated && createdUser) {
        onUserCreated(createdUser);
      }

      onClose();
    } catch (err) {
      console.error('Failed to register user:', err);
      const message =
        err.response?.data?.message ||
        'Failed to register user. Please try again.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {isAdminUserCreation ? 'Create User' : 'Register User'}
          </DialogTitle>
          <DialogDescription>
            {isIconRecruiterRegister
              ? 'Creates a verified app account for icon recruiter host invites. No OTP email is sent.'
              : isAdminUserCreation
                ? 'Create an account and assign a role. Staff page access can be selected here.'
                : 'Creates an app account via the public register API. The user will receive an OTP email to verify their account.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                id="name"
                type="text"
                placeholder="Enter name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`pl-10 ${errors.name ? 'border-red-500' : ''}`}
                disabled={loading}
                autoComplete="off"
              />
            </div>
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          {isAdminUserCreation && canAssignRoles && (
            <div className="space-y-2">
              <Label htmlFor="new-user-role">Role</Label>
              <select
                id="new-user-role"
                value={formData.roleId}
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    roleId: e.target.value,
                    adminPermissions: e.target.value === 'staff' ? prev.adminPermissions : [],
                  }));
                  setErrors((prev) => ({ ...prev, adminPermissions: '' }));
                }}
                disabled={loading}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="user">User</option>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
          )}

          {isAdminUserCreation && canAssignRoles && formData.roleId === 'staff' && (
            <div className="space-y-2 rounded-md border p-3">
              <Label>Staff page access</Label>
              <p className="text-xs text-muted-foreground">Choose the admin pages this staff account can access.</p>
              <div className="grid max-h-40 grid-cols-2 gap-2 overflow-y-auto">
                {permissionPages.map((page) => (
                  <label key={page.key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={formData.adminPermissions.includes(page.key)}
                      onChange={() => setFormData((prev) => ({
                        ...prev,
                        adminPermissions: prev.adminPermissions.includes(page.key)
                          ? prev.adminPermissions.filter((key) => key !== page.key)
                          : [...prev.adminPermissions, page.key],
                      }))}
                      disabled={loading}
                    />
                    {page.label}
                  </label>
                ))}
              </div>
              {errors.adminPermissions && <p className="text-sm text-red-500">{errors.adminPermissions}</p>}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email address *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                disabled={loading}
                autoComplete="off"
              />
            </div>
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Minimum 6 characters"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className={`pl-10 pr-10 ${errors.password ? 'border-red-500' : ''}`}
                disabled={loading}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                disabled={loading}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password *</Label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Re-enter password"
                value={formData.confirmPassword}
                onChange={(e) =>
                  handleInputChange('confirmPassword', e.target.value)
                }
                className={`pl-10 pr-10 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                disabled={loading}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                disabled={loading}
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-red-500">{errors.confirmPassword}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="referralCode">Referral code (optional)</Label>
            <div className="relative">
              <Gift className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                id="referralCode"
                type="text"
                placeholder="ABC123"
                value={formData.referralCode}
                onChange={(e) =>
                  handleInputChange('referralCode', e.target.value.toUpperCase())
                }
                className="pl-10 uppercase"
                disabled={loading}
                autoComplete="off"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isAdminUserCreation ? 'Creating...' : 'Registering...'}
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  {isAdminUserCreation ? 'Create User' : 'Register User'}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateUserDialog;
