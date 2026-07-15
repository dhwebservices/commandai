import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  );

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);

    try {
      const { data, error } = await this.supabase.auth.getUser(token);

      if (error || !data.user) {
        throw new UnauthorizedException('Invalid or expired token');
      }

      // Attach user to request for use in controllers
      request.user = data.user;

      // Get user's tenant_id from database
      const { data: userData } = await this.supabase
        .from('users')
        .select('tenant_id, role')
        .eq('id', data.user.id)
        .single();

      if (userData) {
        request.user.tenant_id = userData.tenant_id;
        request.user.role = userData.role;
      }

      return true;
    } catch (error) {
      throw new UnauthorizedException('Authentication failed');
    }
  }
}
