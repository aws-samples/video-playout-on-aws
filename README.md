## Video Playout on AWS

This sample code helps you setup a simple playout system in your AWS account. Happy Streaming!

# Instructions

This project contains source code and supporting files for a serverless application that you can deploy with the AWS Serverless Application Model (AWS SAM) command line interface (CLI). It includes the following folders:

- `cps-backend` - Code for 'API backend application's' Lambda function. Deploy this component first
- `cps-scheduler` - Code for scheduler application's Lambda function. Deploy this after cps-backend
- `cps-ui` - Code for frontend application application. This will require output parameters from above components.  


## Deploy the application

* We recommend using the [AWS Cloud9 IDE](https://us-east-1.console.aws.amazon.com/cloud9/home/create). 
* You can create a new AWS Cloud9 Environment using this [Tutorial](https://docs.aws.amazon.com/cloud9/latest/user-guide/tutorial-create-environment.html)
* This environment will have all CLIs pre-deployed. 

## To build and deploy cps-backend for the first time, run the following in your shell:
------------------------------------------
* Change directory to cps-backend folder
```bash
sam build
sam deploy --guided --capabilities CAPABILITY_NAMED_IAM
```

    SAM Parameters for Reference
    ------------------------------------------
        Stack Name : cps-backend    
        AWS Region : us-east-1         
        Parameter AppBucketName : cps-s3-scheduler-bucket //Ensure unique bucket name  
        Parameter EpgPath : uploaded_epg/ 
        Parameter Mp4Path : uploaded_mp4/ 
        Parameter MyDynamoDBTableName : cps-ddb-table 
        Parameter CognitoUserPoolName : cps-cognito-userpool 
        Parameter CognitoUserPoolClientName : cps-cognito-app-client 
        Parameter SchedulerApiName : cps-api-schduler 
        Parameter FunctionNameSuffix : cps-functions 
        Parameter Stage : prod 
        #Shows you resources changes to be deployed and require a 'Y' to initiate deploy
        Confirm changes before deploy [y/N]: n
        #SAM needs permission to be able to create roles to connect to the resources in your template
        Allow SAM CLI IAM role creation [Y/n]: y
        GetProgramUrlFunction may not have authorization defined, Is this okay? [y/N]: y
        Save arguments to configuration file [Y/n]: n
        SAM configuration file [samconfig.toml]: samconfig.toml
        SAM configuration environment [default]: default

* Copy and save Output Paramers of the stack to a notepad

## To build and deploy cps-scheduler for the first time, run the following in your shell:
------------------------------------------
* Change directory to cps-scheduler folder
```bash
sam deploy -t channel-assembly-cp.yaml --guided
```
        SAM Parameters for Reference
        ------------------------------------------
        Stack Name [sam-app]: cps-scheduler
        AWS Region [us-east-1]: 
        Parameter ProgramDBUrl []: {{ProgramDBUrl from output of cps-backend}}
        #Shows you resources changes to be deployed and require a 'Y' to initiate deploy
        Confirm changes before deploy [y/N]: 
        #SAM needs permission to be able to create roles to connect to the resources in your template
        Allow SAM CLI IAM role creation [Y/n]: 
        Save arguments to configuration file [Y/n]: 
        SAM configuration file [samconfig.toml]: 
        SAM configuration environment [default]:

* Copy and save Output Paramers of the stack to a notepad

## To build and deploy cps-ui for the first time, run the following in your shell:
------------------------------------------
```bash
npm install
sam build 
sam deploy --guided --capabilities CAPABILITY_NAMED_IAM
```
* Copy and save Output Parameters of the stack to a notepad
* Open config.js in this folder and copy configuration from the output parameters saved by you. 

```bash
aws s3 sync . s3://{{BUCKET_NAME}}
```

## To delete and clean-up, run the following in your shell:
------------------------------------------
To delete the sample application that you created, use the AWS CLI. Assuming you used your project name for the stack name, you can run the following:

```bash
aws cloudformation delete-stack --stack-name cps-backend

aws cloudformation delete-stack --stack-name cps-scheduler

aws cloudformation delete-stack --stack-name cps-ui
```

## Alternatively, you can deploy application using AWS SAM CLI instead of Cloud9

The AWS SAM CLI is an extension of the AWS CLI that adds functionality for building and testing Lambda applications. It uses Docker to run your functions in an Amazon Linux environment that matches Lambda. It can also emulate your application's build environment and API.

To use the AWS SAM CLI, you need the following tools:

* AWS SAM CLI - [Install the AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html).
* Node.js - [Install Node.js 14](https://nodejs.org/en/), including the npm package management tool.
* Docker - [Install Docker community edition](https://hub.docker.com/search/?type=edition&offering=community).


## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.

