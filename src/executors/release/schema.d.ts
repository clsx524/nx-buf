export interface ReleaseExecutorSchema {
  dryRun?: boolean;
  gitRepo: string;
  exportFrom: string;
  protoDir: string;
}
