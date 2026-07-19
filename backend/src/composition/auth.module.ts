import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "../infrastructure/http/controllers/auth.controller";
import { JwtStrategy } from "../infrastructure/http/guards/jwt.strategy";
import { PrismaService } from "../infrastructure/persistence/prisma.service";
import { AuthService } from "../infrastructure/services/auth.service";

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET", "secret"),
        signOptions: {
          expiresIn: configService.get<string>("JWT_EXPIRATION", "15m"),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, PrismaService],
  exports: [AuthService],
})
export class AuthModule {}
