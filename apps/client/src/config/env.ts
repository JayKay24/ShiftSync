import { z } from 'zod';

/**
 * Mapping between domain environment variable names and Vite prefixed environment variables.
 */
const envMapping = {
  API_URL: 'VITE_API_URL',
} as const;

/**
 * Runtime Zod schema validating presence and formatting of required client environment variables.
 */
export const envSchema = z.object({
  API_URL: z.string().url('API_URL must be a valid URL'),
});

/**
 * Parses and validates client environment variables against `envSchema`.
 *
 * @returns {z.infer<typeof envSchema> & { SOCKET_URL: string }} Validated environment configuration with derived socket URL.
 * @throws {Error} If environment validation fails with missing or invalid variables.
 */
const parseEnv = () => {
  const rawEnv: Record<string, string | undefined> = {};

  for (const [cleanKey, viteKey] of Object.entries(envMapping)) {
    rawEnv[cleanKey] = (import.meta.env as Record<string, string | undefined>)[
      viteKey
    ];
  }

  try {
    const validated = envSchema.parse(rawEnv);
    return {
      ...validated,
      SOCKET_URL: validated.API_URL.replace(/\/api\/?$/, ''),
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues
        .map((err) => {
          const cleanKey = err.path.join('.');
          const viteKey = envMapping[cleanKey as keyof typeof envMapping];
          return `${cleanKey} (${viteKey}): ${err.message}`;
        })
        .join('\n');

      throw new Error(
        `❌ Environment validation failed:\n${missingVars}\n\n` +
          `Please check your .env file and ensure all required variables are set.`,
      );
    }
    throw error;
  }
};

/**
 * Application environment configuration object.
 */
export const env = parseEnv();
