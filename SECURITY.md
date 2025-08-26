# Security Policy

## Supported Versions

We release patches for security vulnerabilities based on the CVSS v3.0 Rating:

| Version | Supported          | Security Updates |
| ------- | ------------------ | ---------------- |
| 1.x.x   | :white_check_mark: | Active           |
| < 1.0   | :x:                | End of Life      |

## Reporting a Vulnerability

We take the security of Brand Safety MCP seriously. If you believe you have found a security vulnerability, please report it responsibly.

### Please do NOT:
- Open a public GitHub issue for security vulnerabilities
- Post about the vulnerability on social media before it's fixed
- Attempt to exploit the vulnerability on production systems

### Please DO:
- Email us with details (see contact information below)
- Include the word "SECURITY" in the subject line
- Provide detailed steps to reproduce the vulnerability
- Allow us reasonable time to respond before public disclosure

Please include the following information in your report:
- Type of issue (e.g., buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit the issue

## Security Measures Implemented

### Input Validation
- All user inputs are validated using Zod schemas
- Content length is limited to prevent DoS attacks
- Path traversal protection is implemented for file operations
- Sanitization is applied to all user-provided strings

### Rate Limiting
- Request rate limiting is implemented to prevent abuse
- Configurable limits per client
- Automatic cleanup of expired rate limit entries

### Secure File Operations
- Dynamic imports replace unsafe `eval()` operations
- Path validation ensures file access stays within project boundaries
- File permissions are set to restrictive defaults (0600 for sensitive files)

### Error Handling
- Safe error messages prevent information disclosure
- Internal error details are logged securely
- Stack traces are never exposed to clients

### Dependencies
- Regular dependency updates are performed
- Security audits are run using `npm audit`
- Only trusted, well-maintained packages are used

## Security Best Practices

### For Developers
1. Never use `eval()` or similar dynamic code execution
2. Always validate and sanitize user input
3. Use parameterized queries (when applicable)
4. Implement proper authentication and authorization
5. Keep dependencies up to date
6. Use secure defaults for all configurations

### For Deployment
1. Run the service with minimal privileges
2. Use environment variables for sensitive configuration
3. Enable TLS/SSL for network communication
4. Implement proper logging and monitoring
5. Regular security audits and penetration testing
6. Keep the host system updated and secured

## Security Headers (When Used as Web Service)

If deploying as a web service, implement these security headers:
```
Content-Security-Policy: default-src 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

## Compliance

This project aims to comply with:
- OWASP Top 10 security practices
- CWE/SANS Top 25 Most Dangerous Software Errors
- Security best practices for Node.js applications

## Security Audit History

| Date | Version | Auditor | Result |
|------|---------|---------|--------|
| 2024-01-26 | 1.0.0 | Internal | Passed with fixes applied |

## Contact

For security concerns, please contact:
- Create a security advisory: [GitHub Security Advisories](https://github.com/sapochat/brand-mcp/security/advisories/new)
- For urgent matters: Open an issue with [SECURITY] prefix (do not include exploit details)

## Acknowledgments

We appreciate responsible disclosure of security vulnerabilities. Contributors who report valid security issues will be acknowledged here (with permission).

---

Last Updated: January 26, 2024