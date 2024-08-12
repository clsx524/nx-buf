export interface ReleaseExecutorSchema {
  dryRun?: boolean;
  gitRepo: string;
  exportFrom: string;
  targetDir: string;
  modules: string[];
}
