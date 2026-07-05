import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Activates the `google` Passport strategy for a route. Applying this
 * guard to `GET /auth/google` redirects the user to Google's consent
 * screen; applying it to `GET /auth/google/callback` completes the flow
 * and populates `req.user` with the {@link OAuthSignInOutcome} returned
 * by {@link GoogleStrategy.validate}.
 */
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {}
