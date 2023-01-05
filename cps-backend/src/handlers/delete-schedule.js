const AWS = require('aws-sdk');
const TABLE_NAME = process.env.TABLE_NAME;
var docClient = new AWS.DynamoDB.DocumentClient();
exports.handler = async(event, context) => {
    var channelid = event.queryStringParameters.channelid;
    const myPromise = new Promise((resolve, reject) => {
        var params = {
            TableName: TABLE_NAME,
            KeyConditionExpression: "#PID = :id",
            ExpressionAttributeNames: {
                "#PID": "PId"
            },
            ExpressionAttributeValues: {
                ":id": channelid
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
                console.log("Get Query succeeded.");
                var channel_obj = {},
                    body = {};

                if (event.body) {
                    body = JSON.parse(event.body)

                }
                if (data.Items.length > 0) {
                    channel_obj = data.Items[0];
                    var current_schedule_index = channel_obj.schedule.findIndex(x => { return x.time == body.time });
                    channel_obj.schedule.splice(current_schedule_index, 1);
                }
                else {
                    return reject("No data found");
                }

                params = {
                    TableName: TABLE_NAME,
                    Item: channel_obj
                };

                docClient.put(params, function(err_res, data_res) {
                    if (err_res) {
                        console.error("Unable to query. Error:", JSON.stringify(err_res, null, 2));
                        response.statusCode = 500;
                        response.body = JSON.stringify(err_res)
                        return reject(response);
                    }
                    else {
                        console.log("Put Query succeeded.");
                        response.statusCode = 200;
                        response.body = JSON.stringify(channel_obj);
                        return resolve(response);
                    }
                });
            }
        });
    });
    return myPromise;
}
