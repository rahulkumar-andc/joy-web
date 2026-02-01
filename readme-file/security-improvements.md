# Security Improvements Checklist

- [ ] **Dependency Auditing**: Regular `npm audit` checks.
- [ ] **Environment Security**: Ensure `.env` is never committed (checked).
- [ ] **Header Hardening**:
    - [ ] `X-Content-Type-Options: nosniff`
    - [ ] `X-Frame-Options: DENY`
    - [ ] `Strict-Transport-Security` (HSTS)
- [ ] **Data Sanitization**:
    - [ ] Sanitize all user inputs before DB insertion.
    - [ ] Escape output in HTML (React handles this mostly).
- [ ] **Monitoring**:
    - [ ] Set up alert for high rate of 4xx/5xx errors.
    - [ ] Monitor for brute force patterns.
