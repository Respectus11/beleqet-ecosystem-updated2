import * as fs from 'fs';
import * as path from 'path';

/**
 * Validates the Nginx load-balancer config used for Performance & Network (#41).
 * Ensures strategies, health checks, failover, and multi-currency headers are present.
 */
describe('Nginx load-balancer configuration', () => {
  const confPath = path.join(
    __dirname,
    '../../../infrastructure/nginx/load-balancer.conf',
  );

  let conf: string;

  beforeAll(() => {
    conf = fs.readFileSync(confPath, 'utf8');
  });

  it('should define an upstream pool with both backends', () => {
    expect(conf).toMatch(/upstream\s+beleqet_backend/);
    expect(conf).toContain('server backend-1:4000');
    expect(conf).toContain('server backend-2:4000');
  });

  it('should document round robin, least_conn, and ip_hash strategies', () => {
    expect(conf).toMatch(/Round Robin/i);
    expect(conf).toContain('least_conn');
    expect(conf).toContain('ip_hash');
  });

  it('should configure passive health checks and failover', () => {
    expect(conf).toMatch(/max_fails=\d+/);
    expect(conf).toMatch(/fail_timeout=\d+s/);
    expect(conf).toContain('proxy_next_upstream');
  });

  it('should expose an LB health endpoint that does not hit backends', () => {
    expect(conf).toContain('/lb-health');
    expect(conf).toMatch(/return\s+200/);
  });

  it('should forward multi-currency and region headers', () => {
    expect(conf).toContain('X-Currency');
    expect(conf).toContain('X-Region');
  });

  it('should proxy traffic through the upstream pool', () => {
    expect(conf).toContain('proxy_pass http://beleqet_backend');
  });
});
