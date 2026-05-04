import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class InviteAttendeeDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  firstName: string;
}
