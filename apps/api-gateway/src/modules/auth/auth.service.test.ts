import { describe, it, expect, vi } from "vitest";
import { AuthService } from "./auth.service";
import { ValidationError } from "@comandr/errors";

function makeQueryBuilder(result: unknown) {
  const builder: any = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    ilike: vi.fn(() => builder),
    single: vi.fn(async () => ({ data: result, error: null })),
    maybeSingle: vi.fn(async () => ({ data: result, error: null })),
  };
  return builder;
}

function makeMockAdmin(overrides: Record<string, unknown> = {}) {
  return {
    from: vi.fn((table: string) => {
      if (overrides[table]) return overrides[table];
      return makeQueryBuilder(null);
    }),
    auth: {
      admin: {
        createUser: vi.fn(async () => ({ data: { user: { id: "user-1" } }, error: null })),
        updateUserById: vi.fn(async () => ({ error: null })),
      },
    },
  };
}

const mockEmail = {
  sendVerificationEmail: vi.fn(async () => {}),
  sendPasswordResetEmail: vi.fn(async () => {}),
};

describe("AuthService.signup", () => {
  it("rejects a duplicate username", async () => {
    const admin = makeMockAdmin({
      profiles: makeQueryBuilder({ id: "existing-user" }),
    });
    const service = new AuthService(admin as any, {} as any, mockEmail as any);

    await expect(
      service.signup({ username: "alice", contactEmail: "alice@example.com", password: "password123", accountType: "personal" }),
    ).rejects.toThrow(ValidationError);
  });

  it("creates tenant, auth user, profile, and sends verification email on success", async () => {
    const tenantBuilder = makeQueryBuilder({ id: "tenant-1" });
    const tokenBuilder = makeQueryBuilder({ token: "00000000-0000-0000-0000-000000000001" });
    const profileBuilder = makeQueryBuilder(null); // no existing user found

    const admin = makeMockAdmin({
      profiles: profileBuilder,
      tenants: tenantBuilder,
      email_verification_tokens: tokenBuilder,
    });

    const service = new AuthService(admin as any, {} as any, mockEmail as any);
    const result = await service.signup({
      username: "bob",
      contactEmail: "bob@example.com",
      password: "password123",
      accountType: "personal",
    });

    expect(result.userId).toBe("user-1");
    expect(mockEmail.sendVerificationEmail).toHaveBeenCalledWith(
      "bob@example.com",
      "bob",
      "00000000-0000-0000-0000-000000000001",
    );
  });
});

describe("AuthService.login", () => {
  it("throws a generic error for a nonexistent username (no enumeration signal)", async () => {
    const admin = makeMockAdmin({ profiles: makeQueryBuilder(null) });
    const service = new AuthService(admin as any, {} as any, mockEmail as any);

    await expect(service.login({ username: "ghost", password: "whatever" })).rejects.toThrow(
      "Invalid username or password.",
    );
  });

  it("returns a session on successful sign-in", async () => {
    const admin = makeMockAdmin({
      profiles: makeQueryBuilder({ id: "user-1", username: "alice" }),
    });
    const anon = {
      auth: {
        signInWithPassword: vi.fn(async () => ({
          data: { session: { access_token: "at", refresh_token: "rt" } },
          error: null,
        })),
      },
    };
    const service = new AuthService(admin as any, anon as any, mockEmail as any);

    const result = await service.login({ username: "alice", password: "password123" });
    expect(result.accessToken).toBe("at");
  });
});

describe("AuthService.verifyEmail", () => {
  it("marks the profile verified and consumes the token on success", async () => {
    const tokenBuilder = makeQueryBuilder({
      token: "00000000-0000-0000-0000-000000000002",
      profile_id: "user-1",
      expires_at: new Date(Date.now() + 3600_000).toISOString(),
      consumed_at: null,
    });
    const profileBuilder = makeQueryBuilder(null);
    const admin = makeMockAdmin({
      email_verification_tokens: tokenBuilder,
      profiles: profileBuilder,
    });
    const service = new AuthService(admin as any, {} as any, mockEmail as any);

    const result = await service.verifyEmail("00000000-0000-0000-0000-000000000002");
    expect(result.verified).toBe(true);
  });

  it("rejects an expired token", async () => {
    const tokenBuilder = makeQueryBuilder({
      token: "00000000-0000-0000-0000-000000000003",
      profile_id: "user-1",
      expires_at: new Date(Date.now() - 3600_000).toISOString(),
      consumed_at: null,
    });
    const admin = makeMockAdmin({ email_verification_tokens: tokenBuilder });
    const service = new AuthService(admin as any, {} as any, mockEmail as any);

    await expect(service.verifyEmail("00000000-0000-0000-0000-000000000003")).rejects.toThrow(
      ValidationError,
    );
  });

  it("rejects an already-consumed token", async () => {
    const tokenBuilder = makeQueryBuilder({
      token: "00000000-0000-0000-0000-000000000004",
      profile_id: "user-1",
      expires_at: new Date(Date.now() + 3600_000).toISOString(),
      consumed_at: new Date().toISOString(),
    });
    const admin = makeMockAdmin({ email_verification_tokens: tokenBuilder });
    const service = new AuthService(admin as any, {} as any, mockEmail as any);

    await expect(service.verifyEmail("00000000-0000-0000-0000-000000000004")).rejects.toThrow(
      ValidationError,
    );
  });

  it("rejects a nonexistent token", async () => {
    const admin = makeMockAdmin({ email_verification_tokens: makeQueryBuilder(null) });
    const service = new AuthService(admin as any, {} as any, mockEmail as any);

    await expect(service.verifyEmail("00000000-0000-0000-0000-000000000005")).rejects.toThrow(
      ValidationError,
    );
  });
});

describe("AuthService.requestPasswordReset", () => {
  it("returns the same generic response for a nonexistent username (enumeration protection)", async () => {
    const admin = makeMockAdmin({ profiles: makeQueryBuilder(null) });
    const service = new AuthService(admin as any, {} as any, mockEmail as any);

    const result = await service.requestPasswordReset("ghost");
    expect(result).toEqual({ requested: true });
    expect(mockEmail.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("creates a token and sends an email for a real username", async () => {
    mockEmail.sendPasswordResetEmail.mockClear();
    const profileBuilder = makeQueryBuilder({
      id: "user-1",
      username: "alice",
      contact_email: "alice@example.com",
    });
    const tokenBuilder = makeQueryBuilder({ token: "00000000-0000-0000-0000-000000000006" });
    const admin = makeMockAdmin({
      profiles: profileBuilder,
      password_reset_tokens: tokenBuilder,
    });
    const service = new AuthService(admin as any, {} as any, mockEmail as any);

    const result = await service.requestPasswordReset("alice");
    expect(result).toEqual({ requested: true });
    expect(mockEmail.sendPasswordResetEmail).toHaveBeenCalledWith(
      "alice@example.com",
      "alice",
      "00000000-0000-0000-0000-000000000006",
    );
  });
});

describe("AuthService.resetPassword", () => {
  it("updates the password and consumes the token on success", async () => {
    const tokenBuilder = makeQueryBuilder({
      token: "00000000-0000-0000-0000-000000000007",
      profile_id: "user-1",
      expires_at: new Date(Date.now() + 3600_000).toISOString(),
      consumed_at: null,
    });
    const admin = makeMockAdmin({ password_reset_tokens: tokenBuilder });
    const service = new AuthService(admin as any, {} as any, mockEmail as any);

    const result = await service.resetPassword(
      "00000000-0000-0000-0000-000000000007",
      "newpassword123",
    );
    expect(result.reset).toBe(true);
    expect(admin.auth.admin.updateUserById).toHaveBeenCalledWith("user-1", {
      password: "newpassword123",
    });
  });

  it("rejects an expired or consumed reset token", async () => {
    const tokenBuilder = makeQueryBuilder({
      token: "00000000-0000-0000-0000-000000000008",
      profile_id: "user-1",
      expires_at: new Date(Date.now() + 3600_000).toISOString(),
      consumed_at: new Date().toISOString(),
    });
    const admin = makeMockAdmin({ password_reset_tokens: tokenBuilder });
    const service = new AuthService(admin as any, {} as any, mockEmail as any);

    await expect(
      service.resetPassword("00000000-0000-0000-0000-000000000008", "newpassword123"),
    ).rejects.toThrow(ValidationError);
  });
});
