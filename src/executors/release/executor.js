"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = runExecutor;
const child_process_1 = require("child_process");
const devkit_1 = require("@nx/devkit");
const simple_git_1 = require("simple-git");
async function runExecutor({ dryRun, gitRepo, exportFrom, modules }, context) {
    if (dryRun) {
        if (context.isVerbose)
            devkit_1.logger.info("Not running release because the 'dryRun' flag is set.");
        return { success: true };
    }
    try {
        const currentBranchName = await (0, simple_git_1.simpleGit)().branchLocal();
        console.info(`release under current branch ` + currentBranchName.current);
        const remoteRepoLocalDir = 'tmp-remote-git-buf-repo';
        await (0, simple_git_1.simpleGit)()
            .cwd({ path: '/tmp', root: false })
            .clone(gitRepo, remoteRepoLocalDir)
            .cwd({ path: '/tmp/' + remoteRepoLocalDir, root: false })
            .branch(['-D', currentBranchName.current, '&>/dev/null'])
            .fetch()
            .checkoutLocalBranch(currentBranchName.current);
        // Set the current working directory to the root directory of the source project
        let command = `npx buf export ` + exportFrom + ` -o ` + '/tmp/' + remoteRepoLocalDir + ` --path ` + modules.join(',');
        // Run the 'buf export' command in the current working directory
        if (context.isVerbose)
            devkit_1.logger.info(`running '${command}' ...`);
        await new Promise((resolve, reject) => (0, child_process_1.exec)(command, {}, (error, stdout, stderr) => {
            if (error) {
                devkit_1.logger.error(stdout);
                devkit_1.logger.error(stderr);
                reject(error);
            }
            else {
                resolve();
            }
        }));
        await (0, simple_git_1.simpleGit)()
            .cwd({ path: '/tmp/' + remoteRepoLocalDir, root: false })
            .add(modules)
            .commit('update protobuf files at ' + new Date().toLocaleString())
            .push(['origin', currentBranchName.current]);
        // Return success if the function completes without errors
        return { success: true };
    }
    catch (error) {
        // Log the error and return failure if an error occurs
        devkit_1.logger.error(error);
        return { success: false, error };
    }
}
