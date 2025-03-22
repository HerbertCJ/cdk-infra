import * as cdk from "aws-cdk-lib";
import { AuthStack } from "../lib/auth-stack";
import { FrontendStack } from "../lib/frontend-stack";
import { BackendStack } from "../lib/backend-stack";

const app = new cdk.App();

const authStack = new AuthStack(app, "AuthStack");

new FrontendStack(app, "FrontendStack");

new BackendStack(app, "BackendStack", {
  userPoolId: authStack.userPoolId,
  userPoolClientId: authStack.userPoolClientId,
});
