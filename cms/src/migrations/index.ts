import * as migration_20251123_220411 from './20251123_220411';
import * as migration_20251123_220835 from './20251123_220835';
import * as migration_20251123_225356 from './20251123_225356';
import * as migration_20251125_000000_add_decklists from './20251125_000000_add_decklists';
import * as migration_20251125_001200_fix_decklists_id from './20251125_001200_fix_decklists_id';
import * as migration_20251125_001300_fix_decklists_uuid from './20251125_001300_fix_decklists_uuid';
import * as migration_20251125_001400_fix_decklists_schema from './20251125_001400_fix_decklists_schema';
import * as migration_20251125_001500_fix_decklists_hybrid from './20251125_001500_fix_decklists_hybrid';
import * as migration_20251126_000000_add_read_time from './20251126_000000_add_read_time';

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
  {
    up: migration_20251125_000000_add_decklists.up,
    down: migration_20251125_000000_add_decklists.down,
    name: '20251125_000000_add_decklists'
  },
  {
    up: migration_20251125_001200_fix_decklists_id.up,
    down: migration_20251125_001200_fix_decklists_id.down,
    name: '20251125_001200_fix_decklists_id'
  },
  {
    up: migration_20251125_001300_fix_decklists_uuid.up,
    down: migration_20251125_001300_fix_decklists_uuid.down,
    name: '20251125_001300_fix_decklists_uuid'
  },
  {
    up: migration_20251125_001400_fix_decklists_schema.up,
    down: migration_20251125_001400_fix_decklists_schema.down,
    name: '20251125_001400_fix_decklists_schema'
  },
  {
    up: migration_20251125_001500_fix_decklists_hybrid.up,
    down: migration_20251125_001500_fix_decklists_hybrid.down,
    name: '20251125_001500_fix_decklists_hybrid'
  },
  {
    up: migration_20251126_000000_add_read_time.up,
    down: migration_20251126_000000_add_read_time.down,
    name: '20251126_000000_add_read_time'
  },
];
