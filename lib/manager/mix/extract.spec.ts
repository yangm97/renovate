import { getName, loadFixture } from '../../../test/util';
import { setRepoGlobalConfig } from '../../config/global';
import { extractPackageFile } from '.';

const sample = loadFixture('mix.exs');

describe(getName(), () => {
  beforeEach(() => {
    setRepoGlobalConfig({ localDir: '' });
  });

  describe('extractPackageFile()', () => {
    it('returns empty for invalid dependency file', async () => {
      expect(
        await extractPackageFile('nothing here', 'mix.exs')
      ).toMatchSnapshot();
    });
    it('extracts all dependencies', async () => {
      const res = await extractPackageFile(sample, 'mix.exs');
      expect(res).toMatchSnapshot();
    });
  });
});
