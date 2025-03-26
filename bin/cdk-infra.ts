import * as cdk from "aws-cdk-lib";
import { AuthStack } from "../lib/auth-stack";
import { FrontendStack } from "../lib/frontend-stack";
import { BackendStack } from "../lib/backend-stack";

const app = new cdk.App();

const frontEndStack = new FrontendStack(app, "FrontendStack");
const authStack = new AuthStack(app, "AuthStack", {
  cloudFrontDomain: frontEndStack.cloudFrontDomain,
});

new BackendStack(app, "BackendStack", {
  userPoolId: authStack.userPoolId,
  userPoolClientId: authStack.userPoolClientId,
});
