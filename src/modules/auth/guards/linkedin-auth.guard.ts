import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Activates the `linkedin` Passport strategy for a route. Applying this
 * guard to `GET /auth/linkedin` redirects the user to LinkedIn's consent
 * screen; applying it to `GET /auth/linkedin/callback` completes the
 * flow and populates `req.user` with the {@link OAuthSignInOutcome}
 * returned by {@link LinkedInStrategy.validate}.
 */
@Injectable()
export class LinkedInAuthGuard extends AuthGuard('linkedin') {}
