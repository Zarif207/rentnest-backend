// Shared by the account scripts. They never print a password.

/** At least 12 characters, with a letter, a digit and a symbol. */
export const assertStrongPassword = (name: string, password?: string) => {
  if (!password) {
    throw new Error(`${name} is required.`);
  }
  const problems = [
    password.length < 12 && "at least 12 characters",
    !/[A-Za-z]/.test(password) && "a letter",
    !/[0-9]/.test(password) && "a digit",
    !/[^A-Za-z0-9]/.test(password) && "a symbol",
  ].filter(Boolean);
  if (problems.length) {
    throw new Error(`${name} needs ${problems.join(", ")}.`);
  }
  return password;
};

export const fail = (error: unknown) => {
  console.error(`✖ ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
};
