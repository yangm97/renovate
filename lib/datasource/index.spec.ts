import { getName, logger, mocked } from '../../test/util';
import {
  EXTERNAL_HOST_ERROR,
  HOST_DISABLED,
} from '../constants/error-messages';
import { ExternalHostError } from '../types/errors/external-host-error';
import { loadModules } from '../util/modules';
import { Datasource } from './datasource';
import * as datasourceDocker from './docker';
import { GalaxyDatasource } from './galaxy';
import * as datasourceGithubTags from './github-tags';
import * as datasourceMaven from './maven';
import * as datasourceNpm from './npm';
import * as datasourcePackagist from './packagist';
import type { DatasourceApi } from './types';
import * as datasource from '.';

jest.mock('./docker');
jest.mock('./maven');
jest.mock('./npm');
jest.mock('./packagist');

const dockerDatasource = mocked(datasourceDocker);
const mavenDatasource = mocked(datasourceMaven);
const npmDatasource = mocked(datasourceNpm);
const packagistDatasource = mocked(datasourcePackagist);

describe(getName(), () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });
  it('returns datasources', () => {
    expect(datasource.getDatasources()).toBeDefined();
    expect(datasource.getDatasourceList()).toBeDefined();
  });
  it('validates datasource', () => {
    function validateDatasource(module: DatasourceApi, name: string): boolean {
      if (!module.getReleases) {
        return false;
      }
      return module.id === name;
    }
    function filterClassBasedDatasources(name: string): boolean {
      return !(datasource.getDatasources().get(name) instanceof Datasource);
    }
    const dss = new Map(datasource.getDatasources());

    for (const ds of dss.values()) {
      if (ds instanceof Datasource) {
        dss.delete(ds.id);
      }
    }

    const loadedDs = loadModules(
      __dirname,
      validateDatasource,
      filterClassBasedDatasources
    );
    expect(Array.from(dss.keys())).toEqual(Object.keys(loadedDs));

    for (const dsName of dss.keys()) {
      const ds = dss.get(dsName);
      expect(validateDatasource(ds, dsName)).toBe(true);
    }
  });
  it('returns if digests are supported', () => {
    expect(
      datasource.supportsDigests({ datasource: datasourceGithubTags.id })
    ).toBe(true);
  });
  it('returns null for no datasource', async () => {
    expect(
      await datasource.getPkgReleases({
        datasource: null,
        depName: 'some/dep',
      })
    ).toBeNull();
  });
  it('returns null for no lookupName', async () => {
    expect(
      await datasource.getPkgReleases({
        datasource: 'npm',
        depName: null,
      })
    ).toBeNull();
  });
  it('returns null for unknown datasource', async () => {
    expect(
      await datasource.getPkgReleases({
        datasource: 'gitbucket',
        depName: 'some/dep',
      })
    ).toBeNull();
  });
  it('returns class datasource', async () => {
    expect(
      await datasource.getPkgReleases({
        datasource: 'cdnjs',
        depName: null,
      })
    ).toBeNull();
  });
  it('returns getDigest', async () => {
    expect(
      await datasource.getDigest({
        datasource: datasourceDocker.id,
        depName: 'docker/node',
      })
    ).toBeUndefined();
  });
  it('adds changelogUrl', async () => {
    npmDatasource.getReleases.mockResolvedValue({
      releases: [{ version: '1.0.0' }],
    });
    const res = await datasource.getPkgReleases({
      datasource: datasourceNpm.id,
      depName: 'react-native',
    });
    // FIXME: explicit assert condition
    expect(res).toMatchSnapshot();
    expect(res.changelogUrl).toBeDefined();
    expect(res.sourceUrl).toBeDefined();
  });
  it('applies extractVersion', async () => {
    npmDatasource.getReleases.mockResolvedValue({
      releases: [
        { version: 'v1.0.0' },
        { version: 'v1.0.1' },
        { version: 'v2' },
      ],
    });
    const res = await datasource.getPkgReleases({
      datasource: datasourceNpm.id,
      depName: 'react-native',
      extractVersion: '^(?<version>v\\d+\\.\\d+)',
      versioning: 'loose',
    });
    expect(res.releases).toHaveLength(1);
    expect(res.releases[0].version).toEqual('v1.0');
  });
  it('adds sourceUrl', async () => {
    npmDatasource.getReleases.mockResolvedValue({
      releases: [{ version: '1.0.0' }],
    });
    const res = await datasource.getPkgReleases({
      datasource: datasourceNpm.id,
      depName: 'node',
    });
    // FIXME: explicit assert condition
    expect(res).toMatchSnapshot();
    expect(res.sourceUrl).toBeDefined();
  });
  it('ignores and warns for registryUrls', async () => {
    await datasource.getPkgReleases({
      datasource: GalaxyDatasource.id,
      depName: 'some.dep',
      registryUrls: ['https://google.com/'],
    });
    expect(logger.logger.warn).toHaveBeenCalled();
  });
  it('warns if multiple registryUrls for registryStrategy=first', async () => {
    dockerDatasource.getReleases.mockResolvedValue(null);
    const res = await datasource.getPkgReleases({
      datasource: datasourceDocker.id,
      depName: 'something',
      registryUrls: ['https://docker.com', 'https://docker.io'],
    });
    // FIXME: explicit assert condition
    expect(res).toMatchSnapshot();
  });
  it('hunts registries and returns success', async () => {
    packagistDatasource.getReleases.mockResolvedValueOnce(null);
    packagistDatasource.getReleases.mockResolvedValueOnce({
      releases: [{ version: '1.0.0' }],
    });
    const res = await datasource.getPkgReleases({
      datasource: datasourcePackagist.id,
      depName: 'something',
      registryUrls: ['https://reg1.com', 'https://reg2.io'],
    });
    expect(res).not.toBeNull();
  });
  it('returns null for HOST_DISABLED', async () => {
    packagistDatasource.getReleases.mockImplementationOnce(() => {
      throw new ExternalHostError(new Error(HOST_DISABLED));
    });
    expect(
      await datasource.getPkgReleases({
        datasource: datasourcePackagist.id,
        depName: 'something',
        registryUrls: ['https://reg1.com'],
      })
    ).toBeNull();
  });
  it('hunts registries and aborts on ExternalHostError', async () => {
    packagistDatasource.getReleases.mockImplementationOnce(() => {
      throw new ExternalHostError(new Error());
    });
    await expect(
      datasource.getPkgReleases({
        datasource: datasourcePackagist.id,
        depName: 'something',
        registryUrls: ['https://reg1.com', 'https://reg2.io'],
      })
    ).rejects.toThrow(EXTERNAL_HOST_ERROR);
  });
  it('hunts registries and returns null', async () => {
    packagistDatasource.getReleases.mockImplementationOnce(() => {
      throw new Error('a');
    });
    packagistDatasource.getReleases.mockImplementationOnce(() => {
      throw new Error('b');
    });
    expect(
      await datasource.getPkgReleases({
        datasource: datasourcePackagist.id,
        depName: 'something',
        registryUrls: ['https://reg1.com', 'https://reg2.io'],
      })
    ).toBeNull();
  });
  it('merges registries and returns success', async () => {
    mavenDatasource.getReleases.mockResolvedValueOnce({
      releases: [{ version: '1.0.0' }, { version: '1.1.0' }],
    });
    mavenDatasource.getReleases.mockResolvedValueOnce({
      releases: [{ version: '1.0.0' }],
    });
    const res = await datasource.getPkgReleases({
      datasource: datasourceMaven.id,
      depName: 'something',
      registryUrls: ['https://reg1.com', 'https://reg2.io'],
    });
    // FIXME: explicit assert condition
    expect(res).toMatchSnapshot();
    expect(res.releases).toHaveLength(2);
  });
  it('merges registries and aborts on ExternalHostError', async () => {
    mavenDatasource.getReleases.mockImplementationOnce(() => {
      throw new ExternalHostError(new Error());
    });
    await expect(
      datasource.getPkgReleases({
        datasource: datasourceMaven.id,
        depName: 'something',
        registryUrls: ['https://reg1.com', 'https://reg2.io'],
      })
    ).rejects.toThrow(EXTERNAL_HOST_ERROR);
  });
  it('merges registries and returns null for error', async () => {
    mavenDatasource.getReleases.mockImplementationOnce(() => {
      throw new Error('a');
    });
    mavenDatasource.getReleases.mockImplementationOnce(() => {
      throw new Error('b');
    });
    expect(
      await datasource.getPkgReleases({
        datasource: datasourceMaven.id,
        depName: 'something',
        registryUrls: ['https://reg1.com', 'https://reg2.io'],
      })
    ).toBeNull();
  });
  it('trims sourceUrl', async () => {
    npmDatasource.getReleases.mockResolvedValue({
      sourceUrl: ' https://abc.com',
      releases: [{ version: '1.0.0' }],
    });
    const res = await datasource.getPkgReleases({
      datasource: datasourceNpm.id,
      depName: 'abc',
    });
    expect(res.sourceUrl).toEqual('https://abc.com');
  });
  it('massages sourceUrl', async () => {
    npmDatasource.getReleases.mockResolvedValue({
      sourceUrl: 'scm:git@github.com:Jasig/cas.git',
      releases: [{ version: '1.0.0' }],
    });
    const res = await datasource.getPkgReleases({
      datasource: datasourceNpm.id,
      depName: 'cas',
    });
    expect(res.sourceUrl).toEqual('https://github.com/Jasig/cas');
  });
});
