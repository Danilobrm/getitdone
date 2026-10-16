function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var ${name}`);
  return value;
}

export const env = {
  get sessionSecret() {
    return required("SESSION_SECRET");
  },
  get tz() {
    return process.env.TZ_APP ?? "America/Sao_Paulo";
  },
  /**
   * Code required to create an account. In production sign-up stays closed
   * until this is set; in development it is optional.
   */
  get signupCode() {
    return process.env.SIGNUP_CODE || null;
  },
};
