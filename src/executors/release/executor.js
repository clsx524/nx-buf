"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = runExecutor;
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const devkit_1 = require("@nx/devkit");
const simple_git_1 = require("simple-git");
const fs = __importStar(require("node:fs"));
async function runExecutor({ dryRun, gitRepo, exportFrom, modules, targetProtoDir, targetRepoName }, context) {
    if (dryRun) {
        if (context.isVerbose)
            devkit_1.logger.info("Not running release because the 'dryRun' flag is set.");
        return { success: true };
    }
    try {
        const currentBranch = await (0, simple_git_1.simpleGit)().branchLocal();
        console.info(`release under current branch ` + currentBranch.current);
        fs.rm('/tmp/' + targetRepoName, { recursive: true, force: true }, err => {
            if (err) {
                throw err;
            }
        });
        const remoteRepoBranches = await (0, simple_git_1.simpleGit)()
            .cwd({ path: '/tmp', root: false })
            .clone(gitRepo, targetRepoName)
            .cwd({ path: '/tmp/' + targetRepoName, root: false })
            .fetch()
            .branchLocal();
        if (remoteRepoBranches.all.indexOf(currentBranch.current) > -1)
            await (0, simple_git_1.simpleGit)()
                .cwd({ path: '/tmp/' + targetRepoName, root: false })
                .checkout(currentBranch.current);
        else
            await (0, simple_git_1.simpleGit)()
                .cwd({ path: '/tmp/' + targetRepoName, root: false })
                .checkoutLocalBranch(currentBranch.current);
        // Set the current working directory to the root directory of the source project
        const cwd = path.join(context.root, context.projectGraph.nodes[context.projectName]?.data.root);
        const outputDir = path.join(targetRepoName, targetProtoDir);
        let command = `npx buf export ` + exportFrom + ` -o ` + '/tmp/' + outputDir + ` --path ` + modules.join(',');
        // Run the 'buf export' command in the current working directory
        if (context.isVerbose)
            devkit_1.logger.info(`running '${command}' ...`);
        await new Promise((resolve, reject) => (0, child_process_1.exec)(command, { cwd }, (error, stdout, stderr) => {
            if (error) {
                devkit_1.logger.error(stdout);
                devkit_1.logger.error(stderr);
                reject(error);
            }
            else {
                resolve();
            }
        }));
        const changes = await (0, simple_git_1.simpleGit)()
            .cwd({ path: '/tmp/' + targetRepoName, root: false })
            .diff();
        if (changes === '') {
            console.debug("there is nothing to commit, exiting...");
            return { success: true };
        }
        console.debug("found changes to commit, pushing out the changes ...");
        await (0, simple_git_1.simpleGit)()
            .cwd({ path: '/tmp/' + targetRepoName, root: false })
            .add(modules)
            .commit('update protobuf files at ' + new Date().toLocaleString());
        console.debug("changes are successfully committed");
        if (currentBranch.current !== 'main' && currentBranch.current !== 'master') {
            await (0, simple_git_1.simpleGit)()
                .cwd({ path: '/tmp/' + targetRepoName, root: false })
                .push(['origin', currentBranch.current]);
            console.debug("changes are successfully pushed out to branch " + currentBranch.current);
        }
        // Return success if the function completes without errors
        return { success: true };
    }
    catch (error) {
        // Log the error and return failure if an error occurs
        devkit_1.logger.error(error);
        return { success: false, error };
    }
}
