'use client';

import { useState, useEffect } from 'react';
import { Zap, Lock, Eye, EyeOff, AlertCircle, CheckCircle, XCircle, Share2, RefreshCw, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { evnApi, EvnMemberAccess } from '@/lib/api/evn';

export default function AdminElectricityPage() {

  // Credentials state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // Data state
  const [credentials, setCredentials] = useState<{
    hasCredentials: boolean;
    maskedUsername?: string;
    customerId?: string;
    meterNumber?: string;
    updatedAt?: string;
  } | null>(null);
  const [credentialId, setCredentialId] = useState<string | null>(null);
  const [members, setMembers] = useState<EvnMemberAccess[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Load credentials and members on mount
  useEffect(() => {
    loadCredentials();
  }, []);

  // Load members when credentials exist
  useEffect(() => {
    if (credentials?.hasCredentials && credentialId) {
      loadMembers();
    }
  }, [credentials, credentialId]);

  const loadCredentials = async () => {
    try {
      const data = await evnApi.getCredentials();
      setCredentials(data);

      // Get credentialId from the response
      if (data.hasCredentials && data.credentialId) {
        setCredentialId(data.credentialId);
      }
    } catch (err: any) {
      setError('Không thể tải thông tin EVN: ' + (err.message || 'Lỗi không xác định'));
    } finally {
      setIsLoading(false);
    }
  };

  const loadMembers = async () => {
    try {
      const membersList = await evnApi.getHouseMembers();
      setMembers(membersList);
    } catch (err: any) {
      setError('Không thể tải danh sách thành viên: ' + (err.message || 'Lỗi không xác định'));
    }
  };

  const handleTestConnection = async () => {
    if (!username || !password) {
      setTestResult({ success: false, message: 'Vui lòng nhập username và password' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await evnApi.testConnection({ username, password });
      setTestResult(result);
      if (result.success) {
        setSuccess('Kết nối thành công đến EVN API!');
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Không thể kết nối đến EVN API'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveCredentials = async () => {
    if (!username || !password) {
      setError('Vui lòng nhập đầy đủ username và password');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await evnApi.saveCredentials({ username, password });
      setSuccess('Đã lưu thông tin EVN thành công!');
      setUsername('');
      setPassword('');
      setTestResult(null);
      await loadCredentials();
    } catch (err: any) {
      setError('Không thể lưu thông tin EVN: ' + (err.message || 'Lỗi không xác định'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCredentials = async () => {
    if (!confirm('Bạn có chắc chắn muốn xóa thông tin EVN? Tất cả thành viên sẽ mất quyền truy cập.')) {
      return;
    }

    try {
      await evnApi.deleteCredentials();
      setSuccess('Đã xóa thông tin EVN thành công!');
      setCredentials(null);
      setCredentialId(null);
      setMembers([]);
    } catch (err: any) {
      setError('Không thể xóa thông tin EVN: ' + (err.message || 'Lỗi không xác định'));
    }
  };

  const handleToggleMemberAccess = async (userId: string, currentAccess: boolean) => {
    if (!credentialId) return;

    try {
      if (currentAccess) {
        await evnApi.revokeAccess(credentialId, userId);
        setSuccess('Đã thu quyền truy cập EVN của thành viên');
      } else {
        await evnApi.grantAccess(credentialId, userId);
        setSuccess('Đã cấp quyền truy cập EVN cho thành viên');
      }
      await loadMembers();
    } catch (err: any) {
      setError('Không thể cập nhật quyền truy cập: ' + (err.message || 'Lỗi không xác định'));
    }
  };

  const handleToggleAllAccess = async (grantAccess: boolean) => {
    if (!credentialId) return;

    try {
      await evnApi.toggleAccessForAll(grantAccess);
      setSuccess(grantAccess
        ? 'Đã cấp quyền truy cập cho tất cả thành viên'
        : 'Đã thu quyền truy cập từ tất cả thành viên'
      );
      await loadMembers();
    } catch (err: any) {
      setError('Không thể cập nhật quyền truy cập: ' + (err.message || 'Lỗi không xác định'));
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'OWNER': return 'bg-red-100 text-red-700 border-red-200';
      case 'MANAGER': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'TENANT': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const membersWithAccess = members.filter(m => m.hasAccess).length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50/80 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse w-64" />
          <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/80 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quản lý điện EVN</h1>
            <p className="text-sm text-gray-600">Thiết lập thông tin tài khoản EVN và chia sẻ với thành viên</p>
          </div>
        </div>

        {/* Error/Success Alerts */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Credentials Setup Card */}
        {!credentials?.hasCredentials ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Thiết lập thông tin EVN
              </CardTitle>
              <CardDescription>
                Nhập thông tin tài khoản EVN của bạn để xem chỉ số điện
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">EVN Username</Label>
                  <Input
                    id="username"
                    placeholder="VD: PD30000222084"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">EVN Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mật khẩu EVN"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Test Connection */}
              {testResult && (
                <Alert className={testResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                  {testResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription className={testResult.success ? 'text-green-800' : 'text-red-800'}>
                    {testResult.message}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleTestConnection}
                  disabled={isTesting || !username || !password}
                  variant="outline"
                  className="flex-1"
                >
                  {isTesting ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Test Connection
                </Button>
                <Button
                  onClick={handleSaveCredentials}
                  disabled={isSaving || !username || !password}
                  className="flex-1"
                >
                  {isSaving ? 'Đang lưu...' : 'Lưu thông tin'}
                </Button>
              </div>

              {/* Instructions */}
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Hướng dẫn lấy thông tin EVN:
                </h4>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Truy cập <strong>https://cskh.evnhanoi.vn</strong> hoặc app <strong>EVN HN</strong></li>
                  <li>Đăng nhập với tài khoản đã đăng ký</li>
                  <li>Username thường có dạng <strong>PD + số công tơ</strong> (VD: PD30000222084)</li>
                  <li>Password là mật khẩu bạn tự đặt khi đăng ký</li>
                  <li>Nếu quên mật khẩu, dùng chức năng &quot;Quên mật khẩu&quot; để lấy lại</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Credentials Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Thông tin EVN đã được thiết lập
                </CardTitle>
                <CardDescription>
                  Quản lý thông tin EVN và chia sẻ với thành viên trong nhà
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Username</p>
                    <p className="font-mono font-semibold text-gray-900">{credentials.maskedUsername}</p>
                  </div>
                  {credentials.meterNumber && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Số công tơ</p>
                      <p className="font-mono font-semibold text-gray-900">{credentials.meterNumber}</p>
                    </div>
                  )}
                </div>

                {credentials.updatedAt && (
                  <p className="text-xs text-gray-500">
                    Cập nhật lần cuối: {new Date(credentials.updatedAt).toLocaleString('vi-VN')}
                  </p>
                )}

                <Button onClick={handleDeleteCredentials} variant="outline" className="w-full border-red-300 text-red-600 hover:bg-red-50">
                  <XCircle className="w-4 h-4 mr-2" />
                  Xóa thông tin EVN
                </Button>
              </CardContent>
            </Card>

            {/* Member Access Management Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Share2 className="w-5 h-5" />
                      Chia sẻ với thành viên
                    </CardTitle>
                    <CardDescription>
                      Chọn thành viên có thể xem chỉ số điện EVN
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-sm">
                    {membersWithAccess}/{members.length} thành viên
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Bulk Actions */}
                {members.length > 0 && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleToggleAllAccess(true)}
                      variant="outline"
                      className="flex-1"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Chọn tất cả
                    </Button>
                    <Button
                      onClick={() => handleToggleAllAccess(false)}
                      variant="outline"
                      className="flex-1"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Bỏ chọn tất cả
                    </Button>
                  </div>
                )}

                {/* Members List */}
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {members.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>Chưa có thành viên nào trong nhà</p>
                      <p className="text-sm mt-1">Mời thêm thành viên để chia sẻ thông tin EVN</p>
                    </div>
                  ) : (
                    members.map((member) => (
                      <div
                        key={member.userId}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-bold text-blue-600">
                              {member.fullName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-gray-900">{member.fullName}</p>
                              <Badge className={`text-xs border ${getRoleBadgeColor(member.role)}`}>
                                {member.role === 'OWNER' ? 'Chủ nhà' : member.role === 'MANAGER' ? 'Quản lý' : 'Thành viên'}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-500">{member.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            {member.hasAccess ? 'Được xem' : 'Ẩn'}
                          </span>
                          <Switch
                            checked={member.hasAccess}
                            onCheckedChange={() => handleToggleMemberAccess(member.userId, member.hasAccess)}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
