import { exec } from "child_process";
import * as path from "path";
import { ExecutorContext, logger } from "@nx/devkit";
import { ReleaseExecutorSchema } from "./schema";
import { simpleGit } from 'simple-git';
import * as fs from 'node:fs';

export default async function runExecutor(
  { dryRun, gitRepo, exportFrom, modules, targetProtoDir, targetRepoName }: ReleaseExecutorSchema,
  context: ExecutorContext
) {
  if (dryRun) {
    if (context.isVerbose)
      logger.info("Not running release because the 'dryRun' flag is set.");
    return { success: true };
  }
  try {
    const currentBranch = await simpleGit().branchLocal();
    console.info(`release under current branch ` + currentBranch.current);

    fs.rm('/tmp/' + targetRepoName, { recursive: true, force: true }, err => {
      if (err) {
        throw err;
      }
    });

    const remoteRepoBranches = await simpleGit()
        .cwd({ path: '/tmp', root: false })
        .clone(gitRepo, targetRepoName)
        .cwd({ path: '/tmp/' + targetRepoName, root: false })
        .fetch()
        .branchLocal();

    if (remoteRepoBranches.all.indexOf(currentBranch.current) > -1)
      await simpleGit()
          .cwd({ path: '/tmp/' + targetRepoName, root: false })
          .checkout(currentBranch.current);
    else
      await simpleGit()
          .cwd({ path: '/tmp/' + targetRepoName, root: false })
          .checkoutLocalBranch(currentBranch.current);

    // Set the current working directory to the root directory of the source project
    const cwd = path.join(
        context.root,
        <string>context.projectGraph!.nodes[context.projectName!]?.data.root
    );

    const outputDir = path.join(targetRepoName, targetProtoDir);
    let command = `npx buf export ` + exportFrom  +  ` -o ` + '/tmp/' + outputDir + ` --path ` + modules.join(',');

    // Run the 'buf export' command in the current working directory
    if (context.isVerbose) logger.info(`running '${command}' ...`);
    await new Promise<void>((resolve, reject) =>
        exec(command, { cwd }, (error, stdout, stderr) => {
          if (error) {
            logger.error(stdout);
            logger.error(stderr);
            reject(error);
          } else {
            resolve();
          }
        })
    );

    console.debug("found changes to commit, pushing out the changes ...");
    await simpleGit()
        .cwd({ path: '/tmp/' + targetRepoName, root: false })
        .add(modules);

    const changes = await simpleGit()
        .cwd({ path: '/tmp/' + targetRepoName, root: false })
        .diff(['HEAD']);

    if (changes === '') {
      console.debug("there is nothing to commit, exiting...");
      return { success: true };
    } else {
      await simpleGit()
          .cwd({ path: '/tmp/' + targetRepoName, root: false })
          .commit('update protobuf files at ' + new Date().toLocaleString());
      console.debug("changes are successfully committed");
    }

    if (currentBranch.current !== 'main' && currentBranch.current !== 'master') {
      await simpleGit()
          .cwd({path: '/tmp/' + targetRepoName, root: false})
          .push(['origin', currentBranch.current]);
      console.debug("changes are successfully pushed out to branch " + currentBranch.current);
    }

    // Return success if the function completes without errors
    return { success: true };
  } catch (error) {
    // Log the error and return failure if an error occurs
    logger.error(error);
    return { success: false, error };
  }
}
