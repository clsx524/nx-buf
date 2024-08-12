export interface ReleaseExecutorSchema {
  dryRun?: boolean;
  gitRepo: string;
  exportFrom: string;
  targetProtoDir: string;
  modules: string[];
  targetRepoName: string;
}
