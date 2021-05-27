import * as httpMock from '../../../../test/http-mock';
import { getName, mocked } from '../../../../test/util';
import * as _hostRules from '../../../util/host-rules';
import { setBaseUrl } from '../../../util/http/gitea';
import { PRESET_INVALID_JSON, PRESET_NOT_FOUND } from '../util';
import * as gitea from '.';

jest.mock('../../../util/host-rules');

const hostRules = mocked(_hostRules);

const giteaApiHost = gitea.Endpoint;
const basePath = '/repos/some/repo/contents';

describe(getName(), () => {
  beforeEach(() => {
    hostRules.find.mockReturnValue({ token: 'abc' });
    setBaseUrl(giteaApiHost);
  });

  describe('fetchJSONFile()', () => {
    it('returns JSON', async () => {
      httpMock
        .scope(giteaApiHost)
        .get(`${basePath}/some-filename.json`)
        .reply(200, {
          content: Buffer.from('{"from":"api"}').toString('base64'),
        });

      const res = await gitea.fetchJSONFile(
        'some/repo',
        'some-filename.json',
        giteaApiHost
      );
      expect(res).toMatchSnapshot();
    });
  });

  describe('getPreset()', () => {
    it('tries default then renovate', async () => {
      httpMock
        .scope(giteaApiHost)
        .get(`${basePath}/default.json`)
        .reply(404, {})
        .get(`${basePath}/renovate.json`)
        .reply(200, {});

      await expect(
        gitea.getPreset({ packageName: 'some/repo' })
      ).rejects.toThrow();
    });

    it('throws if no content', async () => {
      httpMock
        .scope(giteaApiHost)
        .get(`${basePath}/default.json`)
        .reply(200, {});

      await expect(
        gitea.getPreset({ packageName: 'some/repo' })
      ).rejects.toThrow(PRESET_INVALID_JSON);
    });

    it('throws if fails to parse', async () => {
      httpMock
        .scope(giteaApiHost)
        .get(`${basePath}/default.json`)
        .reply(200, {
          content: Buffer.from('not json').toString('base64'),
        });

      await expect(
        gitea.getPreset({ packageName: 'some/repo' })
      ).rejects.toThrow(PRESET_INVALID_JSON);
    });

    it('should return default.json', async () => {
      httpMock
        .scope(giteaApiHost)
        .get(`${basePath}/default.json`)
        .reply(200, {
          content: Buffer.from('{"foo":"bar"}').toString('base64'),
        });

      const content = await gitea.getPreset({ packageName: 'some/repo' });
      expect(content).toEqual({ foo: 'bar' });
    });

    it('should query preset within the file', async () => {
      httpMock
        .scope(giteaApiHost)
        .get(`${basePath}/somefile.json`)
        .reply(200, {
          content: Buffer.from('{"somename":{"foo":"bar"}}').toString('base64'),
        });
      const content = await gitea.getPreset({
        packageName: 'some/repo',
        presetName: 'somefile/somename',
      });
      expect(content).toEqual({ foo: 'bar' });
    });

    it('should query subpreset', async () => {
      httpMock
        .scope(giteaApiHost)
        .get(`${basePath}/somefile.json`)
        .reply(200, {
          content: Buffer.from(
            '{"somename":{"somesubname":{"foo":"bar"}}}'
          ).toString('base64'),
        });

      const content = await gitea.getPreset({
        packageName: 'some/repo',
        presetName: 'somefile/somename/somesubname',
      });
      expect(content).toEqual({ foo: 'bar' });
    });

    it('should return custom.json', async () => {
      httpMock
        .scope(giteaApiHost)
        .get(`${basePath}/custom.json`)
        .reply(200, {
          content: Buffer.from('{"foo":"bar"}').toString('base64'),
        });
      const content = await gitea.getPreset({
        packageName: 'some/repo',
        presetName: 'custom',
      });
      expect(content).toEqual({ foo: 'bar' });
    });

    it('should query custom paths', async () => {
      httpMock
        .scope(giteaApiHost)
        .get(`${basePath}/path%2Fcustom.json`)
        .reply(200, {
          content: Buffer.from('{"foo":"bar"}').toString('base64'),
        });
      const content = await gitea.getPreset({
        packageName: 'some/repo',
        presetName: 'custom',
        presetPath: 'path',
      });
      expect(content).toEqual({ foo: 'bar' });
    });

    it('should throws not-found', async () => {
      httpMock
        .scope(giteaApiHost)
        .get(`${basePath}/somefile.json`)
        .reply(200, {
          content: Buffer.from('{}').toString('base64'),
        });
      await expect(
        gitea.getPreset({
          packageName: 'some/repo',
          presetName: 'somefile/somename/somesubname',
        })
      ).rejects.toThrow(PRESET_NOT_FOUND);
    });
  });

  describe('getPresetFromEndpoint()', () => {
    it('uses default endpoint', async () => {
      httpMock
        .scope(giteaApiHost)
        .get(`${basePath}/default.json`)
        .reply(200, {
          content: Buffer.from('{"from":"api"}').toString('base64'),
        });
      expect(
        await gitea.getPresetFromEndpoint('some/repo', 'default', undefined)
      ).toEqual({ from: 'api' });
    });

    it('uses custom endpoint', async () => {
      httpMock
        .scope('https://api.gitea.example.org')
        .get(`${basePath}/default.json`)
        .reply(200, {
          content: Buffer.from('{"from":"api"}').toString('base64'),
        });
      expect(
        await gitea
          .getPresetFromEndpoint(
            'some/repo',
            'default',
            undefined,
            'https://api.gitea.example.org'
          )
          .catch(() => ({ from: 'api' }))
      ).toEqual({ from: 'api' });
    });
  });
});
