#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CdkStackMinimal } from '../lib/cdk-stack-minimal';

const app = new cdk.App();
new CdkStackMinimal(app, 'CdkStackMinimal', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
});