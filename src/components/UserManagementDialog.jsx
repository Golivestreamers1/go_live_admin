import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Select, SelectItem } from './ui/select';
import { Switch } from './ui/switch';
import {
  User,
  Mail,
  Calendar,
  Shield,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Key,
  Trash2,
  Edit,
  Save,
  X,
  BadgeCheck,
  ShieldAlert
} from 'lucide-react';
import api from '../services/api';
import { userService } from '../services/userService';
import { toast } from 'sonner';

const BAN_OPTIONS = [
  { label: '1 day', value: 1 },
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: 'Custom (enter days)', custom: true },
  { label: 'Permanent', permanent: true },
];

export const UserManagementDialog = ({ isOpen, onClose, user, onUserUpdated }) => {
  // Form state for editing
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    isActive: true,
    isVerified: false,
    roleId: ''
  });

  // Verification toggle state
  const [verifyLoading, setVerifyLoading] = useState(false);

  // UI state
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  // Password reset state
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [showTempPassword, setShowTempPassword] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [tempPasswordEmailSent, setTempPasswordEmailSent] = useState(false);

  // Delete confirmation state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Ban options (when blocking user)
  const [showBanOptions, setShowBanOptions] = useState(false);
  const [banLoading, setBanLoading] = useState(false);
  const [customBanDays, setCustomBanDays] = useState('');
  const [showCustomBanInput, setShowCustomBanInput] = useState(false);

  // Check if current user can manage the target user
  const canManageUser = () => {
    const currentUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
    return user && currentUser.role?.level > user.role?.level;
  };

  // Initialize form data when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        username: user.username || '',
        isActive: user.isActive ?? true,
        isVerified: user.isVerified ?? false,
        roleId: user.role?._id || ''
      });
    }
    setError('');
    setIsEditing(false);
    setShowTempPassword(false);
    setTempPasswordEmailSent(false);
    setShowDeleteConfirmation(false);
  }, [user]);

  // Fetch roles when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchRoles();
    }
  }, [isOpen]);

  const fetchRoles = async () => {
    try {
      setRolesLoading(true);
      const response = await api.get('/admin/roles');
      if (response.data.success) {
        setRoles(response.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch roles:', err);
      setError('Failed to load roles');
    } finally {
      setRolesLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleBadgeVariant = (roleName) => {
    switch (roleName) {
      case 'SUPER_ADMIN':
        return 'destructive';
      case 'ADMIN':
        return 'default';
      case 'STAFF':
        return 'secondary';
      case 'USER':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  const handleStatusToggle = async (checked) => {
    if (!user?._id) return;

    const previousValue = formData.isActive;

    if (checked) {
      // Unblock
      setFormData(prev => ({ ...prev, isActive: true }));
      setLoading(true);
      try {
        const updated = await userService.unblockUser(user._id);
        onUserUpdated(updated);
        toast.success('User unblocked successfully!');
      } catch (err) {
        setFormData(prev => ({ ...prev, isActive: previousValue }));
        toast.error(err.response?.data?.message || 'Failed to unblock user');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Block: show ban duration options
    setShowBanOptions(true);
  };

  const handleConfirmBan = async (option) => {
    if (option.custom) {
      setShowCustomBanInput(true);
      return;
    }
    if (!user?._id) return;
    setBanLoading(true);
    try {
      const body = option.permanent ? { permanent: true } : { durationDays: option.value };
      const updated = await userService.blockUser(user._id, body);
      setFormData(prev => ({ ...prev, isActive: false }));
      setShowBanOptions(false);
      setShowCustomBanInput(false);
      setCustomBanDays('');
      onUserUpdated(updated);
      toast.success(
        (option.permanent ? 'User permanently banned.' : `User banned for ${option.label}.`) +
        ' Live stream ended and user logged out across all devices.'
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to ban user');
    } finally {
      setBanLoading(false);
    }
  };

  const handleCustomBanSubmit = async () => {
    const days = parseInt(customBanDays, 10);
    if (!user?._id || !Number.isFinite(days) || days < 1) {
      toast.error('Enter a valid number of days (1 or more).');
      return;
    }
    setBanLoading(true);
    try {
      const updated = await userService.blockUser(user._id, { durationDays: days });
      setFormData(prev => ({ ...prev, isActive: false }));
      setShowBanOptions(false);
      setShowCustomBanInput(false);
      setCustomBanDays('');
      onUserUpdated(updated);
      toast.success(`User banned for ${days} days. Live stream ended and user logged out across all devices.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to ban user');
    } finally {
      setBanLoading(false);
    }
  };

  const handleRoleChange = (roleId) => {
    setFormData(prev => ({
      ...prev,
      roleId
    }));
    if (error) setError('');
  };

  const handleSave = async () => {
    if (!user?._id) return;

    setLoading(true);
    setError('');

    try {
      // Send roleId as ObjectId if role was changed
      const roleChanged = formData.roleId !== user.role?._id;

      const updateData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        username: formData.username,
        isActive: formData.isActive,
        ...(roleChanged && { role: formData.roleId }) // Send ObjectId, not name
      };

      const response = await api.put(`/admin/users/${user._id}`, updateData);

      if (response.data.success) {
        onUserUpdated(response.data.data);
        setIsEditing(false);
        toast.success('User updated successfully!');
      }
    } catch (err) {
      console.error('Failed to update user:', err);
      setError(err.response?.data?.message || 'Failed to update user');
      toast.error('Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      username: user.username || '',
      isActive: user.isActive ?? true,
      isVerified: user.isVerified ?? false,
      roleId: user.role?._id || ''
    });
    setIsEditing(false);
    setError('');
  };

  const handleToggleVerification = async () => {
    if (!user?._id || verifyLoading) return;
    const nextVerified = !formData.isVerified;
    setVerifyLoading(true);
    try {
      const updated = await userService.setVerification(user._id, nextVerified);
      setFormData(prev => ({ ...prev, isVerified: nextVerified }));
      onUserUpdated(updated);
      toast.success(nextVerified ? 'User marked as verified.' : 'User marked as unverified.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update verification status');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setResetPasswordLoading(true);
    try {
      const response = await api.patch(`/admin/users/${user._id}/reset-password`);

      if (response.data.success) {
        const { tempPassword: newTempPassword, emailSent, email } = response.data.data || {};
        setTempPassword(newTempPassword);
        setTempPasswordEmailSent(Boolean(emailSent));
        setShowTempPassword(true);
        if (emailSent && email) {
          toast.success(`Password reset. Email sent to ${email}.`);
        } else {
          toast.success('Password reset. Share the temporary password with the user manually.');
        }
      }
    } catch (error) {
      console.error('Failed to reset password:', error);
      const errorMessage = error.response?.data?.message || 'Failed to reset password. Please try again.';
      toast.error(errorMessage);
    } finally {
      setResetPasswordLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    setDeleteLoading(true);
    try {
      const response = await api.delete(`/admin/users/${user._id}`);

      if (response.data.success) {
        onUserUpdated(null, 'deleted'); // Special signal for deletion
        onClose();
        toast.success(`User ${user.firstName} ${user.lastName} has been deleted successfully.`);
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      const errorMessage = error.response?.data?.message || 'Failed to delete user. Please try again.';
      toast.error(errorMessage);
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirmation(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">

        {/* User Header */}
        <div className="flex items-center space-x-4 pb-4 border-b">

          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">
              {user.firstName} {user.lastName}
            </h3>
            <div className="flex items-center space-x-2 mt-1">
              {formData.isActive ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
              <span className={`text-sm ${
                formData.isActive ? 'text-green-700' : 'text-red-700'
              }`}>
                {formData.isActive ? 'Active' : 'Inactive'}
              </span>
              <Badge variant={getRoleBadgeVariant(user.role?.name)}>
                {user.role?.name || 'No role assigned'}
              </Badge>
              {formData.isVerified ? (
                <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 flex items-center gap-1">
                  <BadgeCheck className="w-3.5 h-3.5" />
                  Verified
                </Badge>
              ) : (
                <Badge variant="outline" className="text-gray-600 border-gray-300 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Unverified
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6 mt-6">
            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                <AlertTriangle className="h-4 w-4" />
                {error}
              </div>
            )}

            {/* Edit Toggle */}
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-medium text-gray-900">
                User Information
              </h4>
              {canManageUser() && !isEditing ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              ) : canManageUser() && isEditing ? (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                    disabled={loading}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic">
                  View Only - Cannot manage users at your level or above
                </div>
              )}
            </div>

            {/* Personal Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  disabled={!canManageUser() || !isEditing || loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  disabled={!canManageUser() || !isEditing || loading}
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={!canManageUser() || !isEditing || loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  disabled={!canManageUser() || !isEditing || loading}
                />
              </div>
            </div>

            {/* Role & Status */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="roleId">Role</Label>
                {rolesLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading roles...
                  </div>
                ) : (
                  <Select
                    value={formData.roleId}
                    onValueChange={handleRoleChange}
                    placeholder="Select a role"
                    disabled={!canManageUser() || !isEditing || loading}
                  >
                    {roles.map((role) => (
                      <SelectItem key={role._id} value={role._id}>
                        <div className="flex items-center justify-between w-full">
                          <span className="flex items-center gap-2">
                            <Shield className="h-3 w-3" />
                            {role.name}
                          </span>
                          <Badge variant="outline" className="ml-2">
                            Level {role.level}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </Select>
                )}
              </div>

            </div>

            {/* Account Information (Read-only) */}
            <div className="space-y-3 pt-4 border-t">
              <h4 className="text-sm font-medium text-gray-900">
                Account Information
              </h4>
              <div className="grid gap-3">
                <div className="flex items-center space-x-3">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <div>
                    <span className="text-sm font-medium text-gray-900">Joined:</span>
                    <span className="text-sm text-gray-600 ml-2">
                      {formatDate(user.createdAt)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <div>
                    <span className="text-sm font-medium text-gray-900">Last Login:</span>
                    <span className="text-sm text-gray-600 ml-2">
                      {user.lastLogin ? formatDate(user.lastLogin) : 'Never'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Activity className="w-4 h-4 text-gray-500" />
                  <div>
                    <span className="text-sm font-medium text-gray-900">Account ID:</span>
                    <span className="text-sm text-gray-600 ml-2 font-mono">
                      {user._id}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            {/* Actions Section */}
            {canManageUser() && (
            <div className="space-y-6 pt-6 border-t">
              <h4 className="text-sm font-medium text-gray-900">
                Account Actions
              </h4>

              {/* Account Status Toggle */}
              <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-blue-800">
                      Account Status / Ban User
                    </h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Inactive = user is banned and cannot log in. Toggle off to choose ban duration (custom time or permanent).
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`text-sm font-medium ${
                      formData.isActive ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {formData.isActive ? 'Active' : 'Banned'}
                    </span>
                    <Switch
                      checked={formData.isActive}
                      onCheckedChange={handleStatusToggle}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              {/* Ban duration modal */}
              <Dialog open={showBanOptions} onOpenChange={(open) => {
                if (!banLoading) {
                  setShowBanOptions(open);
                  if (!open) setShowCustomBanInput(false);
                }
              }}>
                <DialogContent className="sm:max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Ban duration</DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-muted-foreground mb-4">
                    Select how long to ban this user. They will not be able to log in until the ban expires or you unblock.
                  </p>
                  {showCustomBanInput ? (
                    <div className="flex flex-col gap-3">
                      <Label>Number of days</Label>
                      <Input
                        type="number"
                        min={1}
                        placeholder="e.g. 14"
                        value={customBanDays}
                        onChange={(e) => setCustomBanDays(e.target.value)}
                        disabled={banLoading}
                      />
                      <div className="flex gap-2">
                        <Button onClick={handleCustomBanSubmit} disabled={banLoading || !customBanDays.trim()}>
                          {banLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                          Apply
                        </Button>
                        <Button variant="ghost" onClick={() => setShowCustomBanInput(false)} disabled={banLoading}>
                          Back
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col gap-2">
                        {BAN_OPTIONS.map((opt) => (
                          <Button
                            key={opt.permanent ? 'permanent' : opt.custom ? 'custom' : opt.value}
                            variant="outline"
                            className="justify-start"
                            onClick={() => handleConfirmBan(opt)}
                            disabled={banLoading}
                          >
                            {banLoading && !opt.custom ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : null}
                            {opt.label}
                          </Button>
                        ))}
                      </div>
                      <Button variant="ghost" onClick={() => setShowBanOptions(false)} disabled={banLoading}>
                        Cancel
                      </Button>
                    </>
                  )}
                </DialogContent>
              </Dialog>
            {/* Verification Section */}
            <div className={`border rounded-lg p-4 ${formData.isVerified ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start space-x-3">
                  {formData.isVerified ? (
                    <BadgeCheck className="w-5 h-5 text-green-600 mt-0.5" />
                  ) : (
                    <ShieldAlert className="w-5 h-5 text-gray-500 mt-0.5" />
                  )}
                  <div>
                    <h4 className={`text-sm font-medium ${formData.isVerified ? 'text-green-800' : 'text-gray-800'}`}>
                      Account Verification
                    </h4>
                    <p className={`text-sm mt-1 ${formData.isVerified ? 'text-green-700' : 'text-gray-600'}`}>
                      {formData.isVerified
                        ? 'This account is marked as verified (e.g. email OTP confirmed). You can revert this manually.'
                        : 'This account is not verified. Use this to manually mark the account as verified, regardless of whether OTP verification was completed.'}
                    </p>
                  </div>
                </div>
                <Button
                  variant={formData.isVerified ? 'outline' : 'default'}
                  size="sm"
                  onClick={handleToggleVerification}
                  disabled={verifyLoading}
                >
                  {verifyLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : formData.isVerified ? (
                    <>
                      <ShieldAlert className="w-4 h-4 mr-2" />
                      Mark Unverified
                    </>
                  ) : (
                    <>
                      <BadgeCheck className="w-4 h-4 mr-2" />
                      Mark Verified
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Reset Password Section */}
            <div className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
              <div className="flex items-start space-x-3">
                <Key className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-yellow-800">
                    Reset Password
                  </h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    Generate a new temporary password for this user. It will be emailed to them and invalidate their current password.
                  </p>

                  {showTempPassword ? (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                      <p className="text-sm font-medium text-green-800">
                        Password Reset Successful
                      </p>
                      <p className="text-sm text-green-700 mt-1">
                        Temporary Password: <code className="bg-green-100 px-2 py-1 rounded">{tempPassword}</code>
                      </p>
                      <p className="text-xs text-green-600 mt-2">
                        {tempPasswordEmailSent && user.email
                          ? `An email with this password was sent to ${user.email}.`
                          : "Email delivery failed — share this password with the user manually."}
                      </p>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="mt-3"
                      onClick={handleResetPassword}
                      disabled={resetPasswordLoading}
                    >
                      {resetPasswordLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Resetting Password...
                        </>
                      ) : (
                        <>
                          <Key className="w-4 h-4 mr-2" />
                          Reset Password
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Delete User Section */}
            <div className="border border-red-200 rounded-lg p-4 bg-red-50">
              <div className="flex items-start space-x-3">
                <Trash2 className="w-5 h-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-red-800">
                    Delete User
                  </h4>
                  <p className="text-sm text-red-700 mt-1">
                    Permanently delete this user account. This action cannot be undone and will remove all associated data.
                  </p>

                  {!showDeleteConfirmation ? (
                    <Button
                      variant="destructive"
                      className="mt-3"
                      onClick={() => setShowDeleteConfirmation(true)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete User
                    </Button>
                  ) : (
                    <div className="mt-3 space-y-3">
                      <div className="p-3 bg-red-100 border border-red-300 rounded">
                        <p className="text-sm font-medium text-red-800">
                          Are you absolutely sure?
                        </p>
                        <p className="text-sm text-red-700 mt-1">
                          This will permanently delete <strong>{user.firstName} {user.lastName}</strong> and all associated data including:
                        </p>
                        <ul className="text-sm text-red-700 mt-2 list-disc list-inside">
                          <li>Account information</li>
                          <li>Activity history</li>
                          <li>Associated records</li>
                        </ul>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowDeleteConfirmation(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleDeleteUser}
                          disabled={deleteLoading}
                        >
                          {deleteLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-4 h-4 mr-2" />
                              Yes, Delete User
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            </div>
            )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};