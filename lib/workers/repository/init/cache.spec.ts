import { RenovateConfig, getConfig, getName } from '../../../../test/util';
import { setRepoGlobalConfig } from '../../../config/global';
import { initializeCaches } from './cache';

describe(getName(), () => {
  describe('initializeCaches()', () => {
    let config: RenovateConfig;
    beforeEach(() => {
      config = { ...getConfig() };
      setRepoGlobalConfig({ cacheDir: '' });
    });
    it('initializes', async () => {
      expect(await initializeCaches(config)).toBeUndefined();
    });
  });
});
