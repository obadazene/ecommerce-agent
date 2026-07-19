import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../persistence/prisma.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  private getJwtSecret(): string {
    return this.configService.get<string>("JWT_SECRET", "secret");
  }

  private getAccessTokenExpiry(): string {
    return this.configService.get<string>("JWT_EXPIRATION", "15m");
  }

  private getRefreshTokenExpiry(): string {
    return this.configService.get<string>("JWT_REFRESH_EXPIRATION", "7d");
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const payload = { sub: user.id, email: user.email };
    const secret = this.getJwtSecret();

    return {
      accessToken: this.jwtService.sign(payload, {
        secret,
        expiresIn: this.getAccessTokenExpiry(),
      }),
      refreshToken: this.jwtService.sign(payload, {
        secret,
        expiresIn: this.getRefreshTokenExpiry(),
      }),
    };
  }

  async register(
    email: string,
    password: string,
    name: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const existing = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      throw new ConflictException("User already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });

    const payload = { sub: user.id, email: user.email };
    const secret = this.getJwtSecret();

    return {
      accessToken: this.jwtService.sign(payload, {
        secret,
        expiresIn: this.getAccessTokenExpiry(),
      }),
      refreshToken: this.jwtService.sign(payload, {
        secret,
        expiresIn: this.getRefreshTokenExpiry(),
      }),
    };
  }

  async refresh(token: string): Promise<{ accessToken: string }> {
    try {
      const secret = this.getJwtSecret();
      const payload = this.jwtService.verify(token, {
        secret,
      }) as { sub: string; email: string };

      return {
        accessToken: this.jwtService.sign(
          { sub: payload.sub, email: payload.email },
          {
            secret,
            expiresIn: this.getAccessTokenExpiry(),
          },
        ),
      };
    } catch (error) {
      throw new UnauthorizedException("Invalid refresh token");
    }
  }
}
