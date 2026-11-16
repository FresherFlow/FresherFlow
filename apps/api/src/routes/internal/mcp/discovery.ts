import express, { Router, Request, Response, NextFunction } from 'express';
import { getApiPublicUrl } from '../../../utils/runtimeConfig';

/** OAuth 2.1 / OpenID Connect discovery endpoints for the FresherFlow MCP server.

 * The API is the authorization server. The MCP worker redirects here on
 * discovery (GET /.well-known/oauth-authorization-server and
 * /.well-known/openid-configuration) so the issuer and metadata URL agree by
 * construction.
 */

const router: Router = express.Router();

const AUTHORIZATION_SERVER_DOC = {
    issuer: getApiPublicUrl(),
    authorization_endpoint: '/oauth/authorize',
    token_endpoint: '/oauth/token',
    jwks_uri: '/oauth/jwks.json',
    registration_endpoint: '/oauth/register',
    scopes_supported: ['mcp'],
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none', 'private_key_jwt'],
    authorization_response_iss_parameter_supported: true,
};

const OPENID_CONFIGURATION_DOC = {
    ...AUTHORIZATION_SERVER_DOC,
    userinfo_endpoint: '/api/v1/oauth/userinfo',
    revocation_endpoint: '/oauth/revoke',
    id_token_signing_alg_values_supported: ['RS256'],
};

router.get(
    '/.well-known/oauth-authorization-server',
    (_req: Request, res: Response) => {
        res.json(AUTHORIZATION_SERVER_DOC);
    },
);

router.get(
    '/.well-known/openid-configuration',
    (_req: Request, res: Response) => {
        res.json(OPENID_CONFIGURATION_DOC);
    },
);

export default router;
