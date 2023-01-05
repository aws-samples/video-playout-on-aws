const AWS = require('aws-sdk');
const TABLE_NAME = process.env.TABLE_NAME;

var docClient = new AWS.DynamoDB.DocumentClient();
exports.handler = async(event, context) => {
    const myPromise = new Promise((resolve, reject) => {
        var params = {
            TableName: TABLE_NAME
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
        docClient.scan(params, function(err, data) {
            if (err) {
                console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
                response.statusCode = 500;
                response.body = JSON.stringify(err)
                return reject(response);
            }
            else {
                console.log("Query succeeded.");
                response.statusCode = 200;
                var valid_data = data.Items.filter(x => x.name);

                var channels = valid_data.map(function(channel) {
                    var new_obj = {
                        PId: channel.PId,
                        name: channel.name
                    };
                    return new_obj;
                });

                response.body = JSON.stringify(channels)
                return resolve(response);
            }
        });
    });
    return myPromise;
}
