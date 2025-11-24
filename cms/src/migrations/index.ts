import * as migration_20251123_220411 from './20251123_220411';
import * as migration_20251123_220835 from './20251123_220835';
import * as migration_20251123_225356 from './20251123_225356';

export const migrations = [
  {
    up: migration_20251123_220411.up,
    down: migration_20251123_220411.down,
    name: '20251123_220411',
  },
  {
    up: migration_20251123_220835.up,
    down: migration_20251123_220835.down,
    name: '20251123_220835',
  },
  {
    up: migration_20251123_225356.up,
    down: migration_20251123_225356.down,
    name: '20251123_225356'
  },
];
