import { Body, Controller, Post } from "@nestjs/common";
import { LoginDto } from "../../../application/dto/login.dto";
import { RegisterDto } from "../../../application/dto/register.dto";
import { AuthService } from "../../services/auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  async login(
    @Body() body: LoginDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    return this.authService.login(body.email, body.password);
  }

  @Post("register")
  async register(
    @Body() body: RegisterDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    return this.authService.register(body.email, body.password, body.name);
  }

  @Post("refresh")
  async refresh(
    @Body() body: { token: string },
  ): Promise<{ accessToken: string }> {
    return this.authService.refresh(body.token);
  }
}
