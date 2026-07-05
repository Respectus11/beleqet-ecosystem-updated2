import { IsNotEmpty, IsString } from 'class-validator';

/** Body for `POST /auth/refresh`. */
export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
