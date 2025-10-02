import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LogoutDto {
  @ApiProperty({
    description: 'Refresh token to revoke',
    example: 'your-refresh-token-here',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
