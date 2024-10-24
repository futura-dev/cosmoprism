import * as migrateDev from './dev/dev'
import * as migrateReset from './reset/reset'
import * as migrateDeploy from './deploy/deploy'

export const migrate = { 
  dev: migrateDev.dev, 
  reset: migrateReset.reset, 
  deploy: migrateDeploy.deploy 
}