const AWS = require('aws-sdk'),
    fs = require('fs'),
    https = require('https'),
    TABLE_NAME = process.env.TABLE_NAME,
    BUCKET_NAME = process.env.BUCKET_NAME,
    scheduler_path = "/cloudplayout/create",
    URL_EXPIRE_SECONDS = 60,
    S3 = new AWS.S3(),
    KEY = "epg",
    path = require('path');
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

var update_status = async function(params) {
    const myPromise = new Promise((resolve, reject) => {
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

var get_shedule_data = async function(channelid) {
    console.log("channelid =" + channelid);
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
        docClient.query(params, async function(err, data) {
            if (err) {
                console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
                return reject(err);
            }
            else {
                console.log("Get Query succeeded.");
                return resolve(data)
            }
        });
    });
    return myPromise;
}

var upload_to_s3 = async function(epg, channel_key) {
    return S3.putObject({
        Bucket: BUCKET_NAME,
        Key: channel_key,
        ContentType: 'binary',
        Body: Buffer.from(epg, 'binary')
    }).promise();
}

var get_signed_url = function(channel_key) {
    const url = S3.getSignedUrl('getObject', {
        Bucket: BUCKET_NAME,
        Key: channel_key,
        Expires: URL_EXPIRE_SECONDS
    });
    console.log(url);
    return url;
}

var update_database = async function(schedule_data) {
    const myPromise = new Promise((resolve, reject) => {
        var params = {
            RequestItems: {}
        };
        params.RequestItems[TABLE_NAME] = [];
        var put_requests = [];
        console.log(schedule_data);
        for (var i = 0; i < schedule_data.length; i++) {
            var put_request = {
                PutRequest: {
                    Item: schedule_data[i]
                }
            };
            put_requests.push(put_request);
        }
        params.RequestItems[TABLE_NAME] = put_requests;
        docClient.batchWrite(params, function(err, data) {
            if (err) reject(err);
            else resolve(data);
        });
    });
    return myPromise;
}


var create_channel = async function(epg_file, create_api) {
    const myPromise = new Promise((resolve, reject) => {
        var postData = JSON.stringify({ epg_file });
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': postData.length,
            }
        };

        const req = https.request(create_api, options, (res) => {
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

exports.handler = async(event, context) => {
    var epg = fs.readFileSync(path.join(__dirname, '..', 'xmls', 'xmltv.xml'), 'utf8');
    var program_xml = fs.readFileSync(path.join(__dirname, '..', 'xmls', 'programs.xml'), 'utf8');
    var JSON_BODY = JSON.parse(event.body);
    var channelid = JSON_BODY.channelid;
    var scheduler_url = JSON_BODY.url;
    var data = await get_shedule_data(channelid).catch((err) => { console.error(err); });
    if (!data) return send_error_reponse({ message: "Unable to fetch schedule for the day" });

    var programs_data = "",
        schedule_data = [];
    if (data.Items.length > 0 && data.Items[0].schedule) {
        const channel_details = data.Items[0],
            schedule = channel_details.schedule,
            channelid = channel_details.PId;

        epg = epg.replace("{{CHANNEL_ID}}", channel_details.PId);
        epg = epg.replace("{{DISPLAY_NAME}}", channelid);

        for (var i = 0; i < schedule.length; i++) {
            const program = schedule[i];
            if (!program.url || program.url == "") {
                return send_error_reponse({ message: "Please provide urls for all programs in channel" });
            }
            if (schedule_data.filter(x => x.PId == program.programid).length == 0)
                schedule_data.push({ PId: program.programid, url: program.url });
            var temp_program_data = program_xml;
            temp_program_data = temp_program_data.replace("{{PROGRAM_ID}}", program.programid);
            temp_program_data = temp_program_data.replace("{{EPISODE_NUMBER}}", program.episodenumber);
            temp_program_data = temp_program_data.replace("{{TITLE}}", program.title);
            temp_program_data = temp_program_data.replace("{{CATEGORY}}", program.category);
            temp_program_data = temp_program_data.replace("{{DATE}}", new Date());
            temp_program_data = temp_program_data.replace("{{CHANNEL_ID}}", channel_details.PId);
            temp_program_data = temp_program_data.replace("{{START_TIME}}", program.hours + ":" + program.minutes + " +0530");
            programs_data += temp_program_data;
        }
        epg = epg.replace("{{SCHEDULED_PROGRAMS}}", programs_data);

        var ddb_res = await update_database(schedule_data).catch((err) => { console.error(err); });
        if (!ddb_res) return send_error_reponse({ message: "Unable to update program ids and url in DB" });
        var channel_key = `${KEY}/${channel_details.PId}.xml`;
        await upload_to_s3(epg, channel_key).catch((err) => { console.error(err); });
        var epg_signed_url = get_signed_url(channel_key);

        var new_channel_response = await create_channel(epg_signed_url, scheduler_url + scheduler_path).catch((err) => {
            console.error(err);
            return send_error_reponse({ message: "Unable to create channel" });
        });

        console.log(new_channel_response);

        var params = {
            TableName: TABLE_NAME,
            Key: {
                "PId": channelid.trim()
            },
            UpdateExpression: "set channel_status = :new_status",
            ExpressionAttributeValues: {
                ":new_status": "CREATED"
            },
            ReturnValues: "UPDATED_NEW"
        };

        var put_data = await update_status(params).catch((err) => { console.error(err); });
        if (!put_data) return send_error_reponse({ message: "Unable to update schedule for the day" });

        return send_success_reponse({ put_data });
    }
}
