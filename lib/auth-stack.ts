import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cognito from "aws-cdk-lib/aws-cognito";

interface AuthStackProps extends cdk.StackProps {
  cloudFrontDomain: string;
}

export class AuthStack extends cdk.Stack {
  public readonly userPoolId: string;
  public readonly userPoolClientId: string;

  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props);

    const { cloudFrontDomain } = props;

    const userPool = new cognito.UserPool(this, "UserPool", {
      selfSignUpEnabled: true,
      userPoolName: "my-user-pool",
      userVerification: {
        emailSubject: "Verifiy your email",
        emailBody: "Your verification code is {####}",
        emailStyle: cognito.VerificationEmailStyle.CODE,
      },
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true, mutable: true },
      },
    });

    new cognito.UserPoolDomain(this, "UserPoolDomain", {
      userPool: userPool,
      cognitoDomain: {
        domainPrefix: "auth-b08a29b0",
      },
    });

    const userPoolClient = new cognito.UserPoolClient(this, "UserPoolClient", {
      userPool: userPool,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      oAuth: {
        callbackUrls: [`https://${cloudFrontDomain}/home`],
        logoutUrls: [`https://${cloudFrontDomain}/logout`],
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: true,
        },
        scopes: [
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE,
          cognito.OAuthScope.COGNITO_ADMIN,
          cognito.OAuthScope.PHONE,
        ],
      },
    });

    this.userPoolId = userPool.userPoolId;
    this.userPoolClientId = userPoolClient.userPoolClientId;

    new cognito.CfnIdentityPool(this, "IdentityPool", {
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [
        {
          clientId: userPoolClient.userPoolClientId,
          providerName: userPool.userPoolProviderName,
        },
      ],
    });
  }
}
