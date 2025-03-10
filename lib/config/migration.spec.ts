import { getName } from '../../test/util';
import { PLATFORM_TYPE_GITHUB } from '../constants/platforms';
import { setAdminConfig } from './admin';
import { getConfig } from './defaults';
import * as configMigration from './migration';
import type {
  MigratedConfig,
  RenovateConfig,
  RenovateSharedConfig,
} from './types';

const defaultConfig = getConfig();

interface TestRenovateConfig extends RenovateConfig {
  node?: RenovateSharedConfig & { supportPolicy?: unknown };
}

describe(getName(), () => {
  describe('migrateConfig(config, parentConfig)', () => {
    it('migrates config', () => {
      const config: TestRenovateConfig = {
        endpoints: [{}] as never,
        enabled: true,
        platform: PLATFORM_TYPE_GITHUB,
        hostRules: [
          {
            platform: 'docker',
            endpoint: 'https://docker.io',
            host: 'docker.io',
            username: 'some-username',
            password: 'some-password',
          },
        ],
        compatibility: {
          python: '3.7',
        },
        extends: [
          ':automergeBranchMergeCommit',
          'default:js-app',
          'config:library',
          ':masterIssue',
          'helpers:oddIsUnstable',
        ],
        maintainYarnLock: true,
        onboarding: 'false' as never,
        multipleMajorPrs: true,
        gitFs: false,
        ignoreNpmrcFile: true,
        separateMajorReleases: true,
        separatePatchReleases: true,
        suppressNotifications: ['lockFileErrors', 'prEditNotification'],
        automerge: 'none' as never,
        automergeMajor: false,
        binarySource: 'auto',
        automergeMinor: true,
        automergePatch: true,
        masterIssue: 'true',
        masterIssueTitle: 'foo',
        gomodTidy: true,
        upgradeInRange: true,
        trustLevel: 'high',
        automergeType: 'branch-push',
        branchName:
          '{{{branchPrefix}}}{{{managerBranchPrefix}}}{{{branchTopic}}}{{{baseDir}}}',
        baseBranch: 'next',
        managerBranchPrefix: 'foo',
        branchPrefix: 'renovate/{{parentDir}}-',
        renovateFork: true,
        ignoreNodeModules: true,
        node: {
          enabled: true,
        },
        poetry: {
          rebaseStalePrs: true,
          versionScheme: 'pep440',
        },
        pipenv: {
          rebaseStalePrs: false,
          rebaseConflictedPrs: true,
        },
        pip_setup: {
          rebaseConflictedPrs: false,
        },
        rebaseStalePrs: null,
        rebaseConflictedPrs: true,
        meteor: true,
        autodiscover: 'true' as never,
        schedule: 'on the last day of the month' as never,
        commitMessage: '{{semanticPrefix}}some commit message {{depNameShort}}',
        prTitle: '{{semanticPrefix}}some pr title',
        semanticPrefix: 'fix(deps): ',
        pathRules: [
          {
            paths: ['examples/**'],
            extends: ['foo'],
          },
        ],
        peerDependencies: {
          versionStrategy: 'widen',
        },
        packageRules: [
          {
            packagePatterns: '^(@angular|typescript)' as never,
            groupName: ['angular packages'] as never,
            excludedPackageNames: 'foo',
          },
          {
            packagePatterns: ['^foo'],
            groupName: ['foo'] as never,
          },
          {
            packageName: 'angular',
            packagePattern: 'ang',
            enabled: false,
          },
          {
            packageNames: ['guava'],
            versionScheme: 'maven',
          },
          {
            packageNames: ['foo'],
            packageRules: [
              {
                depTypeList: ['bar'],
                automerge: true,
              },
            ],
          },
        ],
        exposeEnv: true,
        lockFileMaintenance: {
          exposeEnv: false,
          gitFs: true,
          automerge: 'any' as never,
          schedule: 'before 5am every day' as never,
        },
        devDependencies: {
          automerge: 'minor',
          schedule: null,
        },
        nvmrc: {
          pathRules: [
            {
              paths: ['node/**'],
              extends: 'node',
            },
          ],
        },
        depTypes: [
          'dependencies',
          {
            depType: 'optionalDependencies',
            respectLatest: false,
            automerge: 'minor',
            schedule: 'before 5am on Mondays',
          },
        ],
        raiseDeprecationWarnings: false,
      } as any;
      const parentConfig = { ...defaultConfig, semanticCommits: 'disabled' };
      const { isMigrated, migratedConfig } = configMigration.migrateConfig(
        config,
        parentConfig
      );
      expect(migratedConfig).toMatchSnapshot();
      expect(isMigrated).toBe(true);
      expect(migratedConfig.depTypes).not.toBeDefined();
      expect(migratedConfig.automerge).toEqual(false);
      expect(migratedConfig.packageRules).toHaveLength(9);
      expect(migratedConfig.hostRules).toHaveLength(1);
    });
    it('migrates before and after schedules', () => {
      const config = {
        major: {
          schedule: 'after 10pm and before 7am' as never,
        },
        minor: {
          schedule: 'after 10pm and before 7am on every weekday' as never,
        },
      };
      const parentConfig = { ...defaultConfig };
      const { isMigrated, migratedConfig } = configMigration.migrateConfig(
        config,
        parentConfig
      );
      expect(migratedConfig).toMatchSnapshot();
      expect(isMigrated).toBe(true);
      expect(migratedConfig.major.schedule).toHaveLength(2);
      expect(migratedConfig.major.schedule[0]).toEqual('after 10pm');
      expect(migratedConfig.major.schedule[1]).toEqual('before 7am');
      expect(migratedConfig.minor.schedule).toMatchSnapshot();
      expect(migratedConfig.minor.schedule).toHaveLength(2);
      expect(migratedConfig.minor.schedule[0]).toEqual(
        'after 10pm every weekday'
      );
      expect(migratedConfig.minor.schedule[1]).toEqual(
        'before 7am every weekday'
      );
    });
    it('migrates every friday', () => {
      const config = {
        schedule: 'every friday' as never,
      };
      const parentConfig = { ...defaultConfig };
      const { isMigrated, migratedConfig } = configMigration.migrateConfig(
        config,
        parentConfig
      );
      expect(isMigrated).toBe(true);
      expect(migratedConfig.schedule).toEqual('on friday');
    });
    it('migrates semantic prefix with no scope', () => {
      const config = {
        semanticPrefix: 'fix',
      };
      const parentConfig = { ...defaultConfig };
      const { isMigrated, migratedConfig } = configMigration.migrateConfig(
        config,
        parentConfig
      );
      expect(isMigrated).toBe(true);
      expect(migratedConfig.semanticCommitScope).toBeNull();
    });
    it('does not migrate every weekday', () => {
      const config = {
        schedule: 'every weekday' as never,
      };
      const parentConfig = { ...defaultConfig };
      const { isMigrated, migratedConfig } = configMigration.migrateConfig(
        config,
        parentConfig
      );
      expect(isMigrated).toBe(false);
      expect(migratedConfig.schedule).toEqual(config.schedule);
    });
    it('does not migrate multi days', () => {
      const config = {
        schedule: 'after 5:00pm on wednesday and thursday' as never,
      };
      const parentConfig = { ...defaultConfig };
      const { isMigrated, migratedConfig } = configMigration.migrateConfig(
        config,
        parentConfig
      );
      expect(migratedConfig).toMatchSnapshot();
      expect(isMigrated).toBe(false);
      expect(migratedConfig.schedule).toEqual(config.schedule);
    });
    it('does not migrate hour range', () => {
      const config = {
        schedule: 'after 1:00pm and before 5:00pm' as never,
      };
      const parentConfig = { ...defaultConfig };
      const { isMigrated, migratedConfig } = configMigration.migrateConfig(
        config,
        parentConfig
      );
      expect(migratedConfig.schedule).toEqual(config.schedule);
      expect(isMigrated).toBe(false);
    });
    it('migrates packages', () => {
      const config = {
        packages: [
          {
            packagePatterns: '^(@angular|typescript)',
            groupName: ['angular packages'],
          },
        ],
      };
      const parentConfig = { ...defaultConfig };
      const { isMigrated, migratedConfig } = configMigration.migrateConfig(
        config,
        parentConfig
      );
      expect(isMigrated).toBe(true);
      expect(migratedConfig).toEqual({
        packageRules: [
          {
            matchPackagePatterns: '^(@angular|typescript)',
            groupName: 'angular packages',
          },
        ],
      });
    });
    it('overrides existing automerge setting', () => {
      const config: TestRenovateConfig = {
        automerge: 'minor' as never,
        packages: [
          {
            packagePatterns: '^(@angular|typescript)',
            automerge: 'patch',
          },
        ],
      };
      const parentConfig = { ...defaultConfig };
      const { isMigrated, migratedConfig } = configMigration.migrateConfig(
        config,
        parentConfig
      );
      expect(isMigrated).toBe(true);
      expect(migratedConfig).toMatchSnapshot();
      expect(migratedConfig.packageRules[0].minor.automerge).toBe(false);
    });
    it('does not migrate config', () => {
      const config: TestRenovateConfig = {
        enabled: true,
        separateMinorPatch: true,
      };
      const { isMigrated, migratedConfig } =
        configMigration.migrateConfig(config);
      expect(isMigrated).toBe(false);
      expect(migratedConfig).toMatchObject(config);
    });
    it('migrates subconfig', () => {
      const config: TestRenovateConfig = {
        lockFileMaintenance: {
          depTypes: [
            'dependencies',
            {
              depType: 'optionalDependencies',
              respectLatest: false,
            },
          ],
        },
      };
      const { isMigrated, migratedConfig } = configMigration.migrateConfig(
        config,
        defaultConfig
      );
      expect(isMigrated).toBe(true);
      expect(migratedConfig).toMatchSnapshot();
      expect(migratedConfig.lockFileMaintenance.packageRules).toHaveLength(1);
      expect(
        migratedConfig.lockFileMaintenance.packageRules[0].respectLatest
      ).toBe(false);
    });

    it('migrates packageRules objects', () => {
      const config = {
        packageRules: {
          packageNames: ['typescript'],
          updateTypes: ['major'],
          commitMessage:
            'fix(package): update peerDependency to accept typescript ^{{newValueMajor}} {{newValueMajor}}',
        },
      } as any;
      const { isMigrated, migratedConfig } = configMigration.migrateConfig(
        config,
        defaultConfig
      );
      expect(isMigrated).toBe(true);
      expect(migratedConfig).toMatchSnapshot();
      expect(migratedConfig.packageRules).toHaveLength(1);
    });
    it('migrates node to travis', () => {
      const config: TestRenovateConfig = {
        node: {
          enabled: true,
          supportPolicy: ['lts'],
          automerge: 'none' as never,
        },
      };
      const { isMigrated, migratedConfig } = configMigration.migrateConfig(
        config,
        defaultConfig
      );
      expect(migratedConfig).toMatchSnapshot();
      expect(isMigrated).toBe(true);
      expect(
        (migratedConfig.node as RenovateSharedConfig).enabled
      ).toBeUndefined();
      expect((migratedConfig.travis as RenovateSharedConfig).enabled).toBe(
        true
      );
      expect(
        (migratedConfig.node as TestRenovateConfig).supportPolicy
      ).toBeDefined();
    });
    it('migrates packageFiles', () => {
      const config: TestRenovateConfig = {
        packageFiles: [
          'package.json',
          { packageFile: 'backend/package.json', pinVersions: false },
          { packageFile: 'frontend/package.json', pinVersions: true },
          {
            packageFile: 'other/package.json',
            devDependencies: { pinVersions: true },
            dependencies: { pinVersions: true },
          },
        ],
      };
      const { isMigrated, migratedConfig } = configMigration.migrateConfig(
        config,
        defaultConfig
      );
      expect(migratedConfig).toMatchSnapshot();
      expect(isMigrated).toBe(true);
      expect(migratedConfig.includePaths).toHaveLength(4);
      expect(migratedConfig.packageFiles).toBeUndefined();
      expect(migratedConfig.packageRules).toHaveLength(4);
      expect(migratedConfig.packageRules[0].rangeStrategy).toBe('replace');
      expect(migratedConfig.packageRules[1].rangeStrategy).toBe('pin');
    });
    it('migrates more packageFiles', () => {
      const config: TestRenovateConfig = {
        packageFiles: [
          {
            packageFile: 'package.json',
            packageRules: [
              {
                pinVersions: true,
                depTypeList: ['devDependencies'],
              },
              {
                pinVersions: true,
                depTypeList: ['dependencies'],
              },
            ],
          },
        ],
      };
      const { isMigrated, migratedConfig } = configMigration.migrateConfig(
        config,
        defaultConfig
      );
      expect(migratedConfig).toMatchSnapshot();
      expect(isMigrated).toBe(true);
      expect(migratedConfig.includePaths).toHaveLength(1);
      expect(migratedConfig.packageFiles).toBeUndefined();
      expect(migratedConfig.packageRules).toHaveLength(2);
    });

    it('removes invalid configs', () => {
      const config: TestRenovateConfig = {
        pathRules: {},
        packageFiles: [{ packageFile: 'test' }],
        gomodTidy: false,
        pinVersions: undefined,
        rebaseStalePrs: true,
        rebaseWhen: 'auto',
        exposeEnv: undefined,
        upgradeInRange: false,
        versionStrategy: undefined,
        ignoreNodeModules: undefined,
        baseBranch: [] as never,
        depTypes: [{}],
        commitMessage: 'test',
        raiseDeprecationWarnings: undefined,
      };
      const { isMigrated, migratedConfig } = configMigration.migrateConfig(
        config,
        defaultConfig
      );
      expect(migratedConfig).toEqual({
        baseBranches: [],
        commitMessage: 'test',
        ignorePaths: [],
        includePaths: ['test'],
        rebaseWhen: 'auto',
      });
      expect(isMigrated).toBe(true);
    });
    it('it migrates semanticCommits', () => {
      let config: TestRenovateConfig;
      let res: MigratedConfig;

      config = { semanticCommits: true as never };
      res = configMigration.migrateConfig(config);
      expect(res.isMigrated).toBe(true);
      expect(res.migratedConfig).toMatchObject({ semanticCommits: 'enabled' });

      config = { semanticCommits: false as never };
      res = configMigration.migrateConfig(config);
      expect(res.isMigrated).toBe(true);
      expect(res.migratedConfig).toMatchObject({ semanticCommits: 'disabled' });

      config = { semanticCommits: null as never };
      res = configMigration.migrateConfig(config);
      expect(res.isMigrated).toBe(true);
      expect(res.migratedConfig).toMatchObject({ semanticCommits: 'auto' });

      config = { semanticCommits: 'enabled' };
      res = configMigration.migrateConfig(config);
      expect(res.isMigrated).toBe(false);
      expect(res.migratedConfig).toMatchObject({ semanticCommits: 'enabled' });

      config = { semanticCommits: 'disabled' };
      res = configMigration.migrateConfig(config);
      expect(res.isMigrated).toBe(false);
      expect(res.migratedConfig).toMatchObject({ semanticCommits: 'disabled' });
    });

    it('it migrates preset strings to array', () => {
      let config: TestRenovateConfig;
      let res: MigratedConfig;

      config = { extends: ':js-app' } as never;
      res = configMigration.migrateConfig(config);
      expect(res.isMigrated).toBe(true);
      expect(res.migratedConfig).toMatchObject({ extends: ['config:js-app'] });

      config = { extends: 'foo' } as never;
      res = configMigration.migrateConfig(config);
      expect(res.isMigrated).toBe(true);
      expect(res.migratedConfig).toMatchObject({ extends: ['foo'] });

      config = { extends: ['foo', ':js-app', 'bar'] } as never;
      res = configMigration.migrateConfig(config);
      expect(res.isMigrated).toBe(true);
      expect(res.migratedConfig).toMatchObject({
        extends: ['foo', 'config:js-app', 'bar'],
      });
    });

    it('it migrates unpublishSafe', () => {
      let config: TestRenovateConfig;
      let res: MigratedConfig;

      config = { unpublishSafe: true };
      res = configMigration.migrateConfig(config);
      expect(res.isMigrated).toBe(true);
      expect(res.migratedConfig).toMatchObject({
        extends: ['npm:unpublishSafe'],
      });

      config = { unpublishSafe: true, extends: 'foo' } as never;
      res = configMigration.migrateConfig(config);
      expect(res.isMigrated).toBe(true);
      expect(res.migratedConfig).toMatchObject({
        extends: ['foo', 'npm:unpublishSafe'],
      });

      config = { unpublishSafe: true, extends: [] };
      res = configMigration.migrateConfig(config);
      expect(res.isMigrated).toBe(true);
      expect(res.migratedConfig).toMatchObject({
        extends: ['npm:unpublishSafe'],
      });

      config = { unpublishSafe: true, extends: ['foo', 'bar'] };
      res = configMigration.migrateConfig(config);
      expect(res.isMigrated).toBe(true);
      expect(res.migratedConfig).toMatchObject({
        extends: ['foo', 'bar', 'npm:unpublishSafe'],
      });

      config = {
        unpublishSafe: true,
        extends: ['foo', ':unpublishSafe', 'bar'],
      };
      res = configMigration.migrateConfig(config);
      expect(res.isMigrated).toBe(true);
      expect(res.migratedConfig).toMatchObject({
        extends: ['foo', 'npm:unpublishSafe', 'bar'],
      });

      config = {
        unpublishSafe: true,
        extends: ['foo', 'default:unpublishSafe', 'bar'],
      };
      res = configMigration.migrateConfig(config);
      expect(res.isMigrated).toBe(true);
      expect(res.migratedConfig).toMatchObject({
        extends: ['foo', 'npm:unpublishSafe', 'bar'],
      });

      config = {
        unpublishSafe: false,
        extends: ['foo', 'bar'],
      };
      res = configMigration.migrateConfig(config);
      expect(res.isMigrated).toBe(true);
      expect(res.migratedConfig).toMatchObject({
        extends: ['foo', 'bar'],
      });

      config = {
        unpublishSafe: true,
        extends: ['foo', 'bar'],
      };
      res = configMigration.migrateConfig(config);
      expect(res.isMigrated).toBe(true);
      expect(res.migratedConfig).toMatchObject({
        extends: ['foo', 'bar', 'npm:unpublishSafe'],
      });

      config = {
        unpublishSafe: true,
        extends: [':unpublishSafeDisabled'],
      };
      res = configMigration.migrateConfig(config);
      expect(res.isMigrated).toBe(true);
      expect(res.migratedConfig).toMatchObject({
        extends: [':unpublishSafeDisabled', 'npm:unpublishSafe'],
      });
    });
    it('migrates combinations of packageRules', () => {
      let config: TestRenovateConfig;
      let res: MigratedConfig;

      config = {
        packages: [{ matchPackagePatterns: ['*'] }],
        packageRules: { matchPackageNames: [] },
      } as never;
      res = configMigration.migrateConfig(config);
      expect(res.isMigrated).toBe(true);
      expect(res.migratedConfig.packageRules).toHaveLength(2);

      config = {
        packageRules: { matchPpackageNames: [] },
        packages: [{ matchPackagePatterns: ['*'] }],
      } as never;
      res = configMigration.migrateConfig(config);
      expect(res.isMigrated).toBe(true);
      expect(res.migratedConfig.packageRules).toHaveLength(2);
    });
    it('it migrates packageRules', () => {
      const config: TestRenovateConfig = {
        packageRules: [
          {
            paths: ['package.json'],
            languages: ['python'],
            baseBranchList: ['master'],
            managers: ['dockerfile'],
            datasources: ['orb'],
            depTypeList: ['peerDependencies'],
            packageNames: ['foo'],
            packagePatterns: ['^bar'],
            excludePackageNames: ['baz'],
            excludePackagePatterns: ['^baz'],
            sourceUrlPrefixes: ['https://github.com/vuejs/vue'],
            updateTypes: ['major'],
          },
        ],
      };
      const { isMigrated, migratedConfig } = configMigration.migrateConfig(
        config,
        defaultConfig
      );
      expect(isMigrated).toBe(true);
      expect(migratedConfig).toEqual({
        packageRules: [
          {
            excludePackageNames: ['baz'],
            excludePackagePatterns: ['^baz'],
            matchBaseBranches: ['master'],
            matchDatasources: ['orb'],
            matchDepTypes: ['peerDependencies'],
            matchLanguages: ['python'],
            matchManagers: ['dockerfile'],
            matchPackageNames: ['foo'],
            matchPackagePatterns: ['^bar'],
            matchPaths: ['package.json'],
            matchSourceUrlPrefixes: ['https://github.com/vuejs/vue'],
            matchUpdateTypes: ['major'],
          },
        ],
      });
    });
  });
  it('it migrates nested packageRules', () => {
    const config: TestRenovateConfig = {
      packageRules: [
        {
          matchDepTypes: ['devDependencies'],
          enabled: false,
        },
        {
          automerge: true,
          excludePackageNames: ['@types/react-table'],
          packageRules: [
            {
              groupName: 'definitelyTyped',
              matchPackagePrefixes: ['@types/'],
            },
            {
              matchDepTypes: ['dependencies'],
              automerge: false,
            },
          ],
        },
      ],
    };
    const { isMigrated, migratedConfig } = configMigration.migrateConfig(
      config,
      defaultConfig
    );
    expect(isMigrated).toBe(true);
    expect(migratedConfig).toMatchSnapshot();
    expect(migratedConfig.packageRules).toHaveLength(3);
  });
  it('it migrates hostRules fields', () => {
    const config: RenovateConfig = {
      hostRules: [
        { baseUrl: 'https://some.domain.com', token: 'abc123' },
        { domainName: 'domain.com', token: 'abc123' },
        { hostName: 'some.domain.com', token: 'abc123' },
      ],
    } as any;
    const { isMigrated, migratedConfig } = configMigration.migrateConfig(
      config,
      defaultConfig
    );
    expect(isMigrated).toBe(true);
    expect(migratedConfig).toEqual({
      hostRules: [
        { matchHost: 'https://some.domain.com', token: 'abc123' },
        { matchHost: 'domain.com', token: 'abc123' },
        { matchHost: 'some.domain.com', token: 'abc123' },
      ],
    });
  });
  it('it migrates presets', () => {
    setAdminConfig({
      migratePresets: {
        '@org': 'local>org/renovate-config',
        '@org2/foo': '',
      },
    });
    const config: RenovateConfig = {
      extends: ['@org', '@org2/foo'],
    } as any;
    const { isMigrated, migratedConfig } = configMigration.migrateConfig(
      config,
      defaultConfig
    );
    expect(isMigrated).toBe(true);
    expect(migratedConfig).toEqual({ extends: ['local>org/renovate-config'] });
  });
});
