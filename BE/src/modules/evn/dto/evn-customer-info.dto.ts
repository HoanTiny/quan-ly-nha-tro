import { ApiProperty } from '@nestjs/swagger';

export class EvnCustomerPoint {
  @ApiProperty()
  maDiemDo!: string;

  @ApiProperty()
  maDonVi!: string;

  @ApiProperty()
  soCto!: string;

  @ApiProperty()
  diaChi!: string;

  @ApiProperty()
  tenKhachHang!: string;

  @ApiProperty()
  soDienThoai!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  maKhachHang!: string;
}

export class EvnCustomerInfoDto {
  @ApiProperty()
  userName!: string;

  @ApiProperty()
  maKhachHang!: string;

  @ApiProperty()
  tenKhachHang!: string;

  @ApiProperty({ type: [EvnCustomerPoint] })
  diemDos!: EvnCustomerPoint[];
}
