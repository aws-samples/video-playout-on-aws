const AWS = require('aws-sdk'),
    https = require('https'),
    TABLE_NAME = process.env.TABLE_NAME,
    scheduler_paths = {
        start: "/cloudplayout/start",
        stop: "/cloudplayout/stop"
    };
var docClient = new AWS.DynamoDB.DocumentClient();

const response = {
    statusCode: 0,
    isBase64Encoded: false,
    headers: {
        "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key",
        "Access-Control-Allow-Methods": "POST, GET, PUT, DELETE",
        "Access-Control-Allow-Origin": "*"
    }
};

var send_error_reponse = function(data) {
    response.statusCode = 400;
    response.body = JSON.stringify(data)
    return response;
}
var send_success_reponse = function(data) {
    response.statusCode = 200;
    response.body = JSON.stringify(data)
    return response;
}

var start_channel = async function(channel_id, scheduler_api) {
    const myPromise = new Promise((resolve, reject) => {
        var postData = JSON.stringify({ channel_id });
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': postData.length,
            }
        };

        const req = https.request(scheduler_api, options, (res) => {
            console.log('statusCode:', res.statusCode);
            console.log('headers:', res.headers);

            const body = []
            res.on('data', (chunk) => body.push(chunk))
            res.on('end', () => {
                const resString = Buffer.concat(body).toString()
                resolve(resString)
            })
        });
        req.write(postData);
        req.on('error', (e) => {
            console.error(e);
            reject(e);
        });
        req.end();
    });
    return myPromise;
}

var update_schedule_data = async function(channel_id, playback_url, action) {
    const myPromise = new Promise((resolve, reject) => {
        const params = {
            TableName: TABLE_NAME,
            Key: {
                "PId": channel_id
            }
        };

        if (action == "stop") {
            params.UpdateExpression = "set #STATUS_Variable = :new_status";
            params.ExpressionAttributeNames = {
                "#STATUS_Variable": "channel_status"
            };
            params.ExpressionAttributeValues = {
                ":new_status": "STOPPED"
            }
        }
        else {
            params.UpdateExpression = "set #URL_Variable = :playback_url, #STATUS_Variable = :new_status";
            params.ExpressionAttributeNames = {
                "#STATUS_Variable": "channel_status",
                "#URL_Variable": "url"
            };
            params.ExpressionAttributeValues = {
                ":new_status": "STARTED",
                ":playback_url": playback_url
            }
        }

        docClient.update(params, function(err_res, data_res) {
            if (err_res) {
                console.error("Unable to query. Error:", JSON.stringify(err_res, null, 2));
                return reject(response);
            }
            else {
                console.log("Put Query succeeded.");
                return resolve(response);
            }
        });
    });
    return myPromise;
};

exports.handler = async(event, context) => {
    const body = JSON.parse(event.body),
        channelid = body.channel_id,
        action = body.action,
        scheduler_api = body.url + scheduler_paths[action];
    var error_message = null;
    var response_string = await start_channel(channelid, scheduler_api).catch((err) => {
        console.error(err);
        error_message = send_error_reponse({ message: "Unable to " + action + " channel", error: err });
    });
    if (error_message) return error_message;

    const response_obj = JSON.parse(response_string);
    console.log(response_obj);
    var put_data = await update_schedule_data(channelid, response_obj.playback_url, action).catch((err) => { console.error(err); });
    if (!put_data) return send_error_reponse({ message: "Unable to update database", data: response_obj });

    return send_success_reponse({ put_data });

}
