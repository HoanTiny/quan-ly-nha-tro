import { apiClient } from './client';

export interface EvnLoginRequest {
  username: string;
  password: string;
}

export interface EvnTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface EvnMeterReadingRequest {
  customerId: string;
  maDiemDo: string;
  maDonVi: string;
  ngayDau: string;
  ngayCuoi: string;
  maXacThuc?: string;
}

export interface TongSanLuong {
  bt?: number;
  cd?: number;
  td?: number;
  vc?: number;
  kt?: number;
}

export interface DailyReading {
  date: string;
  value: number;
  usage?: number;
  soCto?: string;
  maDiemDo?: string;
  hsNhan?: number;
  loaiBcs?: string;
}

export interface EvnMeterReadingResponse {
  customerId?: string;
  maDiemDo?: string;
  soCto?: string;
  readings: DailyReading[];
  latestIndex?: number;
  previousIndex?: number;
  usage?: number;
  tongSanLuong?: TongSanLuong;
}

export interface EvnTestConnectionResponse {
  success: boolean;
  message: string;
  token?: string;
  expiresIn?: number;
}

export interface MonthlyIndexRequest {
  maDViQLy: string;
  maKhachHang: string;
  maDiemDo: string;
  nam: number;
  thang?: number;
}

export interface ChiSoDiemDo {
  bcs: string;
  chiSoCu: number;
  chiSoMoi: number;
  hsNhan: number;
  idChiSo: number;
  ky: number;
  loaiChiSo: string;
  maDdo: string;
  maDonViQuanLy: number;
  maKhang: string;
  maTctto: string | null;
  nam: number;
  namCn: number;
  ngayCapnhat: string;
  ngayCky: string;
  ngayCn: number;
  ngayDky: string;
  sanLuong: number;
  sLuongTrphu: number;
  sLuongTtiep: number;
  soCto: string;
  thang: number;
  thangCn: number;
}

export interface MonthlyIndexResponse {
  maDViQLy?: string;
  maDiemDo?: string;
  nam?: number;
  thang?: number;
  tongSo?: number;
  data?: {
    dmChiSoDiemDoList: ChiSoDiemDo[];
  };
}

export interface EvnCredentials {
  username: string;
  password: string;
}

export interface EvnCredentialsResponse {
  hasCredentials: boolean;
  maskedUsername?: string;
  customerId?: string;
  meterNumber?: string;
  maDiemDo?: string;
  maDonVi?: string;
  updatedAt?: string;
  credentialId?: string;
}

export interface EvnMemberAccess {
  userId: string;
  fullName: string;
  email: string;
  role: 'OWNER' | 'MANAGER' | 'TENANT';
  hasAccess: boolean;
}

export interface Last3MonthsTotalResponse {
  thang1: number;
  thang2: number;
  thang3: number;
  tongCong: number;
  thang1Label?: string;
  thang2Label?: string;
  thang3Label?: string;
}

/**
 * EVN API client for electricity meter integration
 */
export const evnApi = {
  /**
   * Login to EVN API and get access token
   */
  login: async (credentials: EvnLoginRequest): Promise<EvnTokenResponse> => {
    return apiClient.post<EvnTokenResponse>('/evn/login', credentials);
  },

  /**
   * Test connection to EVN API
   */
  testConnection: async (
    credentials?: { username?: string; password?: string },
  ): Promise<EvnTestConnectionResponse> => {
    return apiClient.post<EvnTestConnectionResponse>(
      '/evn/test-connection',
      credentials,
    );
  },

  /**
   * Get meter readings for a customer
   * Requires authentication (uses configured EVN credentials on backend)
   */
  getMeterReadings: async (
    request: EvnMeterReadingRequest,
  ): Promise<EvnMeterReadingResponse> => {
    return apiClient.post<EvnMeterReadingResponse>(
      '/evn/meter-readings',
      request,
    );
  },

  /**
   * Get list of customers from EVN
   */
  getCustomerList: async (): Promise<any> => {
    return apiClient.get<any>('/evn/customers');
  },

  /**
   * Get monthly index from EVN
   */
  getMonthlyIndex: async (
    request: MonthlyIndexRequest,
  ): Promise<MonthlyIndexResponse> => {
    return apiClient.post<MonthlyIndexResponse>('/evn/monthly-index', request);
  },

  // ============= Credentials Management =============

  /**
   * Save EVN credentials for the house
   */
  saveCredentials: async (
    credentials: EvnCredentials,
  ): Promise<{ success: boolean; message: string }> => {
    return apiClient.post('/evn/credentials', credentials);
  },

  /**
   * Get EVN credentials status for the house
   */
  getCredentials: async (): Promise<EvnCredentialsResponse> => {
    return apiClient.get<EvnCredentialsResponse>('/evn/credentials');
  },

  /**
   * Delete EVN credentials for the house
   */
  deleteCredentials: async (): Promise<{ success: boolean; message: string }> => {
    return apiClient.delete('/evn/credentials');
  },

  /**
   * Get all house members with EVN access status (ADMIN ONLY)
   */
  getHouseMembers: async (): Promise<EvnMemberAccess[]> => {
    return apiClient.get<EvnMemberAccess[]>('/evn/credentials/members');
  },

  /**
   * Grant EVN access to a specific member (ADMIN ONLY)
   */
  grantAccess: async (credentialId: string, userId: string): Promise<{ success: boolean; message: string }> => {
    return apiClient.post(`/evn/credentials/${credentialId}/grant`, { userId });
  },

  /**
   * Revoke EVN access from a member (ADMIN ONLY)
   */
  revokeAccess: async (credentialId: string, userId: string): Promise<{ success: boolean; message: string }> => {
    return apiClient.delete(`/evn/credentials/${credentialId}/revoke/${userId}`);
  },

  /**
   * Toggle EVN access for all members at once (ADMIN ONLY)
   */
  toggleAccessForAll: async (
    grantAccess: boolean,
  ): Promise<{ success: boolean; message: string }> => {
    return apiClient.post('/evn/credentials/toggle-all', { grantAccess });
  },

  /**
   * Check if current user has EVN access
   */
  checkAccess: async (): Promise<{ hasAccess: boolean }> => {
    return apiClient.get('/evn/credentials/check-access');
  },

  /**
   * Get total electricity for last 3 months
   */
  getLast3MonthsTotal: async (): Promise<Last3MonthsTotalResponse> => {
    return apiClient.get<Last3MonthsTotalResponse>('/evn/last-3-months-total');
  },
};
