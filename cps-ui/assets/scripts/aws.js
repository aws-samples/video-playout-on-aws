//https://docs.aws.amazon.com/code-samples/latest/catalog/javascript-cognito-cognito_getcreds.html.html

const COGNITO_IDENTITY_ID = CONFIG.COGNITO_IDENTITY_ID,
    BUCKET_NAME = CONFIG.BUCKET_NAME,
    EPG_PATH = CONFIG.EPG_PATH,
    USER_POOL_ID = CONFIG.USER_POOL_ID,
    CLIENT_ID = CONFIG.CLIENT_ID;

AWS.config.region = CONFIG.REGION;
var cognito = new AWS.CognitoIdentityServiceProvider();

function updateCredentails(callback) {
    var loginMap = {};
    loginMap['cognito-idp.' + CONFIG.REGION + '.amazonaws.com/' + USER_POOL_ID] = getToken();
    AWS.config.update({
        region: CONFIG.REGION,
        credentials: new AWS.CognitoIdentityCredentials({
            IdentityPoolId: COGNITO_IDENTITY_ID,
            Logins: loginMap
        })
    });
    AWS.config.credentials.get(function(err) {
        if (err) {
            callback(err, null);
        }
        else {
            callback(null, AWS);
        }
    });
}

function login(USERNAME, PASSWORD, callback) {
    const payload = {
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: CLIENT_ID,
        AuthParameters: {
            USERNAME,
            PASSWORD
        }
    }
    cognito.initiateAuth(payload, callback);
}


const aws = {
    auth(Username, Password, Callback) {
        login(Username, Password, function(err, data) {

            if (err)
                return alert(err);

            if (data.ChallengeName == "NEW_PASSWORD_REQUIRED") {
                var params = {
                    Session: data.Session,
                    ChallengeName: "NEW_PASSWORD_REQUIRED",
                    ChallengeResponses: {
                        NEW_PASSWORD: Password,
                        USERNAME: Username
                    },
                    ClientId: CLIENT_ID
                }
                cognito.respondToAuthChallenge(params, function(err, auth_data) {
                    Callback(auth_data.AuthenticationResult)
                });
            }
            else {
                Callback(data.AuthenticationResult)
            }
        });
    },
    upload(params, callback) {
        updateCredentails(function(err, aws) {
            if (err)
                return callback(err);
            var s3 = new aws.S3();
            params.Bucket = BUCKET_NAME;
            params.Key = EPG_PATH + params.Key;
            s3.putObject(params, callback);
        });
    }
}
