const NUMERIC_KEYS = ['PORT', 'BCRYPT_ROUNDS'] as const;

export function validateEnvironment(config: Record<string, unknown>): Record<string, unknown> {
  for (const key of NUMERIC_KEYS) {
    const value = config[key];
    if (value === undefined || value === '') {
      continue;
    }
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new Error(`Variavel de ambiente ${key} deve ser um inteiro nao negativo.`);
    }
  }

  if (process.env.NODE_ENV === 'production') {
    if (config.JWT_SECRET === undefined || config.JWT_SECRET === 'troque-este-segredo') {
      throw new Error('JWT_SECRET deve ser definido em producao.');
    }
  }

  return config;
}
