import * as cdk from 'aws-cdk-lib';
import * as amplify from 'aws-cdk-lib/aws-amplify';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import { Construct } from 'constructs';

export class SapCompleteStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ==================================================
    // 1. GitHub Token (既存のTokenを使用)
    // ==================================================
    const githubToken = new secretsmanager.Secret(this, 'GitHubToken', {
      secretName: 'github-token-sap-project',
      description: 'GitHub Personal Access Token for SAP Project',
      secretStringValue: cdk.SecretValue.unsafePlainText(process.env.GITHUB_TOKEN || ''),
    });

    // ==================================================
    // 2. Amplify App - フロントエンドホスティング
    // ==================================================
    const amplifyApp = new amplify.CfnApp(this, 'SapAmplifyApp', {
      name: 'sap-strategic-ai-platform',
      repository: 'https://github.com/tsailink0611/sap-project-frontend',
      accessToken: githubToken.secretValue.unsafeUnwrap(),
      platform: 'WEB',
      
      // ビルド設定
      buildSpec: `version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci --cache .npm --prefer-offline
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - '.npm/**/*'
`,
      
      // 環境変数
      environmentVariables: [
        {
          name: 'VITE_API_ENDPOINT',
          value: '/api/analysis',
        },
        {
          name: 'VITE_SUPABASE_URL',
          value: 'https://lmyejjujmzorqmrwpljz.supabase.co',
        },
        {
          name: 'VITE_SUPABASE_ANON_KEY',
          value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxteWVqanVqbXpvcnFtcndwbGp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4ODg2OTksImV4cCI6MjA3MTQ2NDY5OX0.rs83Ywz7ltUZ9H_cIFpDbc9RKsMwnj_oMthkg8VKBG0',
        },
      ],
      
      // カスタムルール（SPAルーティング）
      customRules: [
        {
          source: '/api/analysis',
          target: 'https://zixh8m4d9l.execute-api.us-east-1.amazonaws.com/prod/analysis',
          status: '200',
        },
        {
          source: '</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|ttf|map|json|webp)$)([^.]+$)/>',
          target: '/index.html',
          status: '200',
        },
      ],
    });

    // Amplifyブランチ設定
    const mainBranch = new amplify.CfnBranch(this, 'MainBranch', {
      appId: amplifyApp.attrAppId,
      branchName: 'main',
      enableAutoBuild: true,
      stage: 'PRODUCTION',
      framework: 'React',
      enablePerformanceMode: true,
    });

    // ==================================================
    // 3. Lambda関数 - バックエンド処理
    // ==================================================
    const analysisLambda = new lambda.Function(this, 'SapAnalysisLambda', {
      functionName: 'sap-analysis-handler',
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'lambda_function.lambda_handler',
      code: lambda.Code.fromAsset('../lambda/sap-claude-handler'),
      timeout: cdk.Duration.minutes(5),
      memorySize: 1024,
      environment: {
        CLAUDE_API_KEY: process.env.CLAUDE_API_KEY || '',
        VITE_SUPABASE_URL: 'https://lmyejjujmzorqmrwpljz.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxteWVqanVqbXpvcnFtcndwbGp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4ODg2OTksImV4cCI6MjA3MTQ2NDY5OX0.rs83Ywz7ltUZ9H_cIFpDbc9RKsMwnj_oMthkg8VKBG0',
      },
      description: 'SAP Strategic AI Platform Analysis Handler',
    });

    // ==================================================
    // 4. API Gateway - REST API
    // ==================================================
    const api = new apigateway.RestApi(this, 'SapApi', {
      restApiName: 'SAP Strategic AI Platform API',
      description: 'API for SAP analysis and AI processing',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
      deployOptions: {
        stageName: 'prod',
        throttlingBurstLimit: 1000,
        throttlingRateLimit: 500,
        loggingLevel: apigateway.MethodLoggingLevel.OFF,
        dataTraceEnabled: false,
        metricsEnabled: true,
      },
    });

    // API リソースとメソッド
    const analysisResource = api.root.addResource('analysis');
    analysisResource.addMethod('POST', new apigateway.LambdaIntegration(analysisLambda));

    // ==================================================
    // 5. 出力
    // ==================================================
    new cdk.CfnOutput(this, 'AmplifyAppURL', {
      description: 'Amplify Application URL',
      value: `https://main.${amplifyApp.attrDefaultDomain}`,
      exportName: 'SapAmplifyURL',
    });

    new cdk.CfnOutput(this, 'ApiEndpoint', {
      description: 'API Gateway Endpoint',
      value: api.url,
      exportName: 'SapApiEndpoint',
    });

    new cdk.CfnOutput(this, 'AmplifyAppId', {
      description: 'Amplify App ID',
      value: amplifyApp.attrAppId,
      exportName: 'SapAmplifyAppId',
    });
  }
}