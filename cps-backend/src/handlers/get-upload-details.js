const AWS = require('aws-sdk'),
    DOMAIN_NAME = "",
    EXPIRES_IN = 24, //in hours
    PRIVATE_KEY = ``,
    PUBLIC_KEY = ``;

var getSignedCookie = function() {
    const cloudFront = new AWS.CloudFront.Signer(PUBLIC_KEY, PRIVATE_KEY);


    const policy = JSON.stringify({
        Statement: [{
            Resource: 'http*://' + DOMAIN_NAME + '/*',
            Condition: {
                DateLessThan: {
                    'AWS:EpochTime': Math.floor(new Date().getTime() / 1000) + 60 * 60 * EXPIRES_IN, // Current Time in UTC + time in seconds, (60 * 60 * 1 = 1 hour)
                },
            },
        }, ],
    });
    const cookie = cloudFront.getSignedCookie({ policy });
    console.log(cookie);
    var headers = {
        'Set-Cookie': []
    }
    Object.keys(cookie).forEach(key => {
        headers['Set-Cookie'].push(key + "=" + cookie[key] + "; Domain=" + DOMAIN_NAME + "; Path=/; Secure=true; HttpOnly=true;");
    });
    return headers;
}

const response = {
    statusCode: 200,
    isBase64Encoded: false,
    headers: {
        "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key",
        "Access-Control-Allow-Methods": "POST, GET, PUT, DELETE",
        "Access-Control-Allow-Origin": "*"
    },
    body: null
};

exports.handler = async(event, context) => {
    response.multiValueHeaders = getSignedCookie();
    return response;
};


// `CloudFront-Key-Pair-Id=${cookie['CloudFront-Key-Pair-Id']}; Domain=${DOMAIN_NAME}; Path=/; Secure=true; HttpOnly=true;`
//             `CloudFront-Policy=${cookie['CloudFront-Policy']}; Domain=${DOMAIN_NAME}; Path=/; Secure=true; HttpOnly=true;`
//             `CloudFront-Signature=${cookie['CloudFront-Signature']}; Domain=${DOMAIN_NAME}; Path=/; Secure=true; HttpOnly=true;`
