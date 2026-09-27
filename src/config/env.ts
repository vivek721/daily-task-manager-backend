// Secrets the API cannot run safely without. Values copied from .env.example are treated
// as unset so a deployment can't go live with the published placeholder.
const REQUIRED_SECRETS: Record<string, string> = {
  JWT_SECRET: 'your-super-secure-jwt-secret-here',
};

/** Names of required secrets that are unset, blank, or still the .env.example placeholder. */
export const getMissingSecrets = (env: NodeJS.ProcessEnv = process.env): string[] =>
  Object.entries(REQUIRED_SECRETS)
    .filter(([name, placeholder]) => {
      const value = env[name]?.trim();
      return !value || value === placeholder;
    })
    .map(([name]) => name);
