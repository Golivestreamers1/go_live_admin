import React, { useState, useEffect } from 'react';
import { userService } from '../services/userService';
import { useListQueryState } from '../hooks/useListQueryState';
import { useNavigateWithReturn } from '../hooks/useListNavigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { UserManagementDialog } from '../components/UserManagementDialog';
import { CreateUserDialog } from '../components/CreateUserDialog';
import {
  Users,
  Search,
  Filter,
  User,
  Shield,
  CheckCircle,
  XCircle,
  Eye,
  UserPlus,
  Trash2,
  BadgeCheck,
  ShieldAlert,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

const UserManagement = () => {
  const { params, setQuery } = useListQueryState({ filterKeys: ['search', 'role'] });
  const navigateWithReturn = useNavigateWithReturn();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(params.search);
  const [selectedRole, setSelectedRole] = useState(params.role);
  const [pagination, setPagination] = useState({
    current: 1,
    total: 1,
    count: 0,
    totalUsers: 0
  });
  const [userManagementDialogOpen, setUserManagementDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);

  const fetchUsers = async (page = 1, search = '', role = '') => {
    try {
      setLoading(true);
      const response = await userService.getAllUsers({
        page,
        limit: 10,
        search,
        role
      });

      setUsers(response.users);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSearchTerm(params.search);
    setSelectedRole(params.role);
  }, [params.search, params.role]);

  useEffect(() => {
    fetchUsers(params.page, params.search, params.role);
  }, [params.page, params.search, params.role]);

  const handleSearch = (e) => {
    e.preventDefault();
    setQuery({ page: 1, search: searchTerm, role: selectedRole });
  };

  const handleRoleFilter = (role) => {
    setSelectedRole(role);
    setQuery({ page: 1, role, search: searchTerm });
  };

  const handlePageChange = (newPage) => {
    setQuery({ page: newPage });
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

  const handleViewDetails = (user) => {
    setSelectedUser(user);
    setUserManagementDialogOpen(true);
  };

  const handleUserUpdated = (updatedUser, action) => {
    if (action === 'deleted') {
      // Remove user from the list
      setUsers(users.filter(u => u._id !== selectedUser._id));
    } else if (updatedUser) {
      // Update user in the list
      setUsers(users.map(user =>
        user._id === updatedUser._id ? updatedUser : user
      ));

      // Update selected user if it's the same user
      if (selectedUser && selectedUser._id === updatedUser._id) {
        setSelectedUser(updatedUser);
      }
    }
    // Refresh the data to ensure consistency
    fetchUsers(params.page, params.search, params.role);
  };

  const handleUserCreated = (newUser) => {
    setUsers((prevUsers) => [newUser, ...prevUsers]);
    fetchUsers(params.page, params.search, params.role);
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-600 mt-1">
          Manage users, roles, and permissions across the system
        </p>
      </div>


      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pagination.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Across all roles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {users.filter(user => user.isActive).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {users.filter(user => ['Admin', 'Super Admin'].includes(user.role?.name)).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Admin level users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New This Month (Dummy Data)</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">12</div>
            <p className="text-xs text-muted-foreground">
              Recent registrations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>User Directory</CardTitle>
              <CardDescription>
                Search and filter users by role, name, or email
              </CardDescription>
            </div>
            <Button
              onClick={() => setCreateUserDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Register User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <form onSubmit={handleSearch} className="flex gap-2 flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by name, email, or username..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button type="submit">Search</Button>
            </form>

            <div className="flex gap-2">
              <Button
                variant={selectedRole === '' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleRoleFilter('')}
              >
                All
              </Button>
              <Button
                variant={selectedRole === 'ADMIN' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleRoleFilter('ADMIN')}
              >
                Admin
              </Button>
              <Button
                variant={selectedRole === 'STAFF' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleRoleFilter('STAFF')}
              >
                Staff
              </Button>
              <Button
                variant={selectedRole === 'USER' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleRoleFilter('USER')}
              >
                User
              </Button>
            </div>
          </div>

          {/* Users Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Delete User</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                          <div className="text-xs text-gray-400">@{user.username}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role?.name)}>
                        {user.role?.name || 'No role'}
                      </Badge>
                      {user.role?.level && (
                        <div className="text-xs text-gray-500 mt-1">
                          Level {user.role.level}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {user.isActive ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                        <span className={`text-sm ${
                          user.isActive ? 'text-green-700' : 'text-red-700'
                        }`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.isVerified ? (
                        <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 flex items-center gap-1 w-fit">
                          <BadgeCheck className="w-3.5 h-3.5" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-600 border-gray-300 flex items-center gap-1 w-fit">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          Unverified
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      <button>
                        <Trash2 color='red' size={20} />
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigateWithReturn(`/users/${user._id}`)}
                          title="Open full details page"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Open
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(user)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-500">
              Showing {((pagination.current - 1) * 10) + 1} to {Math.min(pagination.current * 10, pagination.totalUsers)} of {pagination.totalUsers} users
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.current - 1)}
                disabled={pagination.current <= 1}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-500">
                Page {pagination.current} of {pagination.total}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.current + 1)}
                disabled={pagination.current >= pagination.total}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Management Dialog */}
      <UserManagementDialog
        isOpen={userManagementDialogOpen}
        onClose={() => setUserManagementDialogOpen(false)}
        user={selectedUser}
        onUserUpdated={handleUserUpdated}
      />

      {/* Create User Dialog */}
      <CreateUserDialog
        isOpen={createUserDialogOpen}
        onClose={() => setCreateUserDialogOpen(false)}
        onUserCreated={handleUserCreated}
      />
    </div>
  );
};

export default UserManagement;