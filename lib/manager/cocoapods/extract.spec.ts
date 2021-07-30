import { getName, loadFixture } from '../../../test/util';
import { setRepoGlobalConfig } from '../../config/global';
import type { RepoGlobalConfig } from '../../config/types';
import { extractPackageFile } from '.';

const simplePodfile = loadFixture('Podfile.simple');
const complexPodfile = loadFixture('Podfile.complex');

const adminConfig: RepoGlobalConfig = {
  localDir: '',
};

describe(getName(), () => {
  describe('extractPackageFile()', () => {
    it('extracts all dependencies', async () => {
      setRepoGlobalConfig(adminConfig);
      const simpleResult = (await extractPackageFile(simplePodfile, 'Podfile'))
        .deps;
      expect(simpleResult).toMatchSnapshot();

      const complexResult = (
        await extractPackageFile(complexPodfile, 'Podfile')
      ).deps;
      expect(complexResult).toMatchSnapshot();
    });
  });
});
