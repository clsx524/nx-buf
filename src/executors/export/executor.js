"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = runExecutor;
const child_process_1 = require("child_process");
const devkit_1 = require("@nx/devkit");
async function runExecutor({ dryRun, gitRepo, exportTo, modules }, context) {
    if (dryRun) {
        if (context.isVerbose)
            devkit_1.logger.info("Not running 'buf export' because the 'dryRun' flag is set.");
        return { success: true };
    }
    try {
        // Set the current working directory to the root directory of the source project
        let command = `npx buf export ` + gitRepo + ` -o ` + exportTo + ` --path ` + modules.join(',');
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
        // Return success if the function completes without errors
        return { success: true };
    }
    catch (error) {
        // Log the error and return failure if an error occurs
        devkit_1.logger.error(error);
        return { success: false, error };
    }
}
