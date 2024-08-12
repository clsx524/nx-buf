import { exec } from "child_process";
import * as path from "path";
import { ExecutorContext, logger } from "@nx/devkit";
import { ReleaseExecutorSchema } from "./schema";
import { simpleGit } from 'simple-git';

export default async function runExecutor(
  { dryRun, gitRepo, exportFrom, modules }: ReleaseExecutorSchema,
  context: ExecutorContext
) {
  if (dryRun) {
    if (context.isVerbose)
      logger.info("Not running release because the 'dryRun' flag is set.");
    return { success: true };
  }
  try {
    const currentBranchName = await simpleGit().branchLocal();
    console.info(`release under current branch ` + currentBranchName.current);
    const remoteRepoLocalDir = 'tmp-remote-git-buf-repo';
    await simpleGit()
        .cwd({ path: '/tmp', root: false })
        .clone(gitRepo, remoteRepoLocalDir)
        .cwd({ path: '/tmp/' + remoteRepoLocalDir, root: false })
        .branch(['-D', currentBranchName.current, '&>/dev/null'])
        .fetch()
        .checkoutLocalBranch(currentBranchName.current);

    // Set the current working directory to the root directory of the source project
    let command = `npx buf export ` + exportFrom  +  ` -o ` + '/tmp/' + remoteRepoLocalDir + ` --path ` + modules.join(',');

    // Run the 'buf export' command in the current working directory
    if (context.isVerbose) logger.info(`running '${command}' ...`);
    await new Promise<void>((resolve, reject) =>
        exec(command, {}, (error, stdout, stderr) => {
          if (error) {
            logger.error(stdout);
            logger.error(stderr);
            reject(error);
          } else {
            resolve();
          }
        })
    );

    await simpleGit()
        .cwd({ path: '/tmp/' + remoteRepoLocalDir, root:false })
        .add(modules)
        .commit('update protobuf files at ' + new Date().toLocaleString())
        .push(['origin', currentBranchName.current]);

    // Return success if the function completes without errors
    return { success: true };
  } catch (error) {
    // Log the error and return failure if an error occurs
    logger.error(error);
    return { success: false, error };
  }
}
