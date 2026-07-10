# Testing

Unit tests cover: config fail-fast when TLS paths are missing and the
insecure flag isn't set, config allowing insecure mode only when the flag
is explicitly true, and verifyAgentCertificate always throwing (confirms
the gate is actually a gate, not a silent no-op).

Not yet covered (blocked on ADR-010's open gap, not a testing oversight):
any test of a successful authenticated call, since no such path exists yet.
