import { Controller, Post, Body, HttpCode, HttpStatus, UsePipes, ValidationPipe } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth') 
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  
  @Post('signin')
  @HttpCode(HttpStatus.OK) 
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })) 
  async login(@Body() loginDto: LoginDto) {

    const userData = await this.authService.login(loginDto);

    return {
        statusCode: HttpStatus.OK,
        message: 'Login bem-sucedido!',
        data: userData 
    };
  }
}

