export interface ExportExecutorSchema {
  dryRun?: boolean;
  gitRepo: string;
  exportTo: string;
  modules: string[];
}
