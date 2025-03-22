import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigatewayv2";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as authorizers from "aws-cdk-lib/aws-apigatewayv2-authorizers";

interface BackendStackProps extends cdk.StackProps {
  userPoolId: string;
  userPoolClientId: string;
}

export class BackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: BackendStackProps) {
    super(scope, id, props);

    const { userPoolId, userPoolClientId } = props;

    const usersTable = new dynamodb.Table(this, "UsersTable", {
      tableName: "Users",
      partitionKey: { name: "email", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    const ecrRepo = ecr.Repository.fromRepositoryName(
      this,
      "EcrRepo",
      "backend-lambda-repo"
    );

    const backendLambda = new lambda.DockerImageFunction(
      this,
      "BackendLambda",
      {
        functionName: "BackendLambda",
        code: lambda.DockerImageCode.fromEcr(ecrRepo, {
          tagOrDigest: "latest",
        }),
        architecture: lambda.Architecture.X86_64,
        memorySize: 1024,
        timeout: cdk.Duration.seconds(29),
        environment: {
          USERS_TABLE: "Users",
          RUST_LOG: "info",
        },
      }
    );

    ecrRepo.grantPull(backendLambda);
    usersTable.grantReadWriteData(backendLambda);

    const httpApi = new apigateway.HttpApi(this, "BackendApi", {
      apiName: "BackendHttpApi",
      corsPreflight: {
        allowHeaders: ["Authorization", "Content-Type"],
        allowMethods: [
          apigateway.CorsHttpMethod.GET,
          apigateway.CorsHttpMethod.POST,
          apigateway.CorsHttpMethod.PATCH,
          apigateway.CorsHttpMethod.DELETE,
        ],
        allowOrigins: ["*"], //change to my cloudfront origin from frontendstack
        maxAge: cdk.Duration.days(10),
      },
    });

    const httpAuthorizer = new authorizers.HttpJwtAuthorizer(
      "HttpCognitoAuthorizer",
      `https://cognito-idp.${this.region}.amazonaws.com/${userPoolId}`,
      {
        jwtAudience: [userPoolClientId],
      }
    );

    const integration = new integrations.HttpLambdaIntegration(
      "LambdaIntegration",
      backendLambda
    );

    httpApi.addRoutes({
      path: "/",
      methods: [apigateway.HttpMethod.ANY],
      integration,
    });

    httpApi.addRoutes({
      path: "/{proxy+}",
      methods: [
        apigateway.HttpMethod.POST,
        apigateway.HttpMethod.PATCH,
        apigateway.HttpMethod.DELETE,
        apigateway.HttpMethod.GET,
      ],
      integration,
      authorizer: httpAuthorizer,
    });

    new cdk.CfnOutput(this, "ApiUrl", {
      value: httpApi.url!,
      description: "URL da API Gateway",
    });

    new cdk.CfnOutput(this, "EcrRepoUri", {
      value: ecrRepo.repositoryUri,
      description: "URI do repositório ECR",
    });
  }
}
