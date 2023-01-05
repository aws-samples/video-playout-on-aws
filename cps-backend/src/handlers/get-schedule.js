const AWS = require('aws-sdk');
const TABLE_NAME = process.env.TABLE_NAME;

var docClient = new AWS.DynamoDB.DocumentClient();
exports.handler = async(event, context) => {
    var channelid = event.queryStringParameters.channelid;
    var pid = event.queryStringParameters.pid;
    const myPromise = new Promise((resolve, reject) => {
        var params = {
            TableName: TABLE_NAME,
            KeyConditionExpression: "#PID = :id",
            ExpressionAttributeNames: {
                "#PID": "PId"
            },
            ExpressionAttributeValues: {
                ":id": channelid || pid
            }
        };
        const response = {
            statusCode: 0,
            isBase64Encoded: false,
            headers: {
                "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key",
                "Access-Control-Allow-Methods": "POST, GET, PUT, DELETE",
                "Access-Control-Allow-Origin": "*"
            }
        };
        docClient.query(params, function(err, data) {
            if (err) {
                console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
                response.statusCode = 500;
                response.body = JSON.stringify(err)
                return reject(response);
            }
            else {
                console.log("Query succeeded.");
                response.statusCode = 200;
                response.body = JSON.stringify(pid ? data.Items[0] : data.Items)
                return resolve(response);
            }
        });
    });
    return myPromise;
}
