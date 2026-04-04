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
    credentials?: EvnLoginRequest,
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
};
