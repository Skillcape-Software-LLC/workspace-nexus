# Security Policy

## Supported Versions

Nexus is pre-1.0 software. Security fixes are applied to the latest commit on `main` only.

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Instead, email the maintainers directly or use GitHub's private vulnerability reporting:
**Security → Report a vulnerability** on this repository.

Include:
- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fix (optional)

You can expect an acknowledgement within 72 hours and a resolution or status update within 14 days.

## Scope

In-scope:
- Authentication bypass (API key middleware)
- Injection vulnerabilities (SQL, command, XSS via note markdown rendering)
- Secrets leaking through API responses
- Webhook signature validation bypass

Out of scope:
- Attacks requiring physical access to the host
- Self-XSS
- Vulnerabilities in third-party dependencies that have no available fix
