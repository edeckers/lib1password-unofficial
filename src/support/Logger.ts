type Level = "debug" | "info" | "warn" | "error" | "silent";

const LevelIndex: Record<Level, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

export const createLogger = (level: Level) => {
  let currentLevel = level;

  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    debug: (...args: any[]) => {
      if (LevelIndex[currentLevel] > LevelIndex["debug"]) return;

      console.debug(...args);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    info: (...args: any[]) => {
      if (LevelIndex[currentLevel] > LevelIndex["info"]) return;

      console.info(...args);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    warn: (...args: any[]) => {
      if (LevelIndex[currentLevel] > LevelIndex["warn"]) return;

      console.warn(...args);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error: (...args: any[]) => {
      if (LevelIndex[currentLevel] > LevelIndex["error"]) return;

      console.error(...args);
    },

    setLevel: (level: Level) => {
      currentLevel = level;
    },
  };
};
