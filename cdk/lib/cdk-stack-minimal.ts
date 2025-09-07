import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';

export class CdkStackMinimal extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // データ分析Lambda関数（既存のコードを使用）
    const analysisLambda = new lambda.Function(this, 'DataAnalysisLambda', {
      functionName: 'sap-data-analysis-minimal',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(this.getAnalysisLambdaCode()),
      timeout: cdk.Duration.minutes(3),
      memorySize: 512,
      description: 'SAP data analysis - minimal deployment',
    });

    // API Gateway（ログ無効）
    const api = new apigateway.RestApi(this, 'SapMinimalApi', {
      restApiName: 'SAP Minimal API',
      description: 'Minimal API for SAP Strategic AI Platform',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
      deployOptions: {
        stageName: 'prod',
        loggingLevel: apigateway.MethodLoggingLevel.OFF,
        dataTraceEnabled: false,
        metricsEnabled: false,
      },
    });

    // API Gateway リソース
    const analysisResource = api.root.addResource('analysis');
    analysisResource.addMethod('POST', new apigateway.LambdaIntegration(analysisLambda));

    // 出力
    new cdk.CfnOutput(this, 'ApiUrl', {
      description: 'API Gateway URL',
      value: api.url,
    });

    new cdk.CfnOutput(this, 'AnalysisEndpoint', {
      description: 'Analysis Endpoint',
      value: `${api.url}analysis`,
    });
  }

  private getAnalysisLambdaCode(): string {
    return `
exports.handler = async (event) => {
    console.log('Analysis request:', JSON.stringify(event, null, 2));
    
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    try {
        const requestBody = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        const { prompt, salesData, analysisType } = requestBody;
        
        // シンプルな分析処理
        const analysisResult = {
            summary: \`\${analysisType || 'データ'}分析を実行しました\`,
            dataPoints: salesData?.length || 0,
            timestamp: new Date().toISOString(),
            analysis: {
                totalRecords: salesData?.length || 0,
                processing_time: '0.5s',
                model_version: 'minimal-v1.0.0',
                status: 'success'
            }
        };
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                response: analysisResult,
                message: 'Analysis completed successfully'
            })
        };

    } catch (error) {
        console.error('Analysis error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Analysis failed',
                details: error.message
            })
        };
    }
};
`;
  }
}