export class AuthResponseDto {
  access_token: string;
  user: {
    id: number;
    username: string;
    employeeId: number;
    roles: string[];
  };
} 