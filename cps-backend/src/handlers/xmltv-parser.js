const AWS = require('aws-sdk'),
    s3 = new AWS.S3(),
    fs = require('fs'),
    xmltvToJsonapi = require('xmltv-to-jsonapi'),
    TEMP_FOLDER = '/tmp/';

const TABLE_NAME = process.env.TABLE_NAME;
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

var mapToSchedule = function(epd_json) {
    var schedules = [];
    epd_json.data.forEach(record => {
        var schedule = {};
        var attribs = record.attributes;
        var categories = attribs.categories.map(x => x.value)
        schedule.category = categories.join(',');
        var pid = attribs.episodeNum.filter(x => x.system == "dd_progid")
        schedule.programid = pid && pid.length > 0 ? pid[0].value : Math.ceil(Math.random() * 1000);
        var episodenumber = attribs.episodeNum.filter(x => x.system == "onscreen")
        schedule.episodenumber = episodenumber && episodenumber.length > 0 ? episodenumber[0].value : "unknown";
        var starttime = attribs.start;
        schedule.hours = starttime.substring(10, 8);
        schedule.minutes = starttime.substring(12, 10);
        schedule.title = attribs.title[0].value;
        schedule.time = schedule.hours + ":" + schedule.minutes;
        schedules.push(schedule);
    });
    if (schedules.length > 1) {
        schedules.sort((a, b) => {
            return (((parseInt(a.hours) * 60) + parseInt(a.minutes)) - ((parseInt(b.hours) * 60) + parseInt(b.minutes)));
        })
    }
    return schedules;
}

var get_xml = async function(event) {
    const myPromise = new Promise((resolve, reject) => {
        var xml_obj = "";
        const getObjectRequests = event.Records.map(record => {
            const params = {
                Bucket: record.s3.bucket.name,
                Key: record.s3.object.key
            };
            s3.getObject(params, function(err, data) {
                if (err) {
                    reject(err)
                }
                var filename = TEMP_FOLDER + Math.ceil(Math.random() * 10000) + '.xml';
                fs.writeFileSync(filename, data.Body)
                resolve({ filename, key: record.s3.object.key });
            })
        });
    });
    return myPromise;
}

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

var put_schedule_data = async function(params) {
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

exports.handler = async(event, context) => {
    var file_obj = await get_xml(event).catch(err => console.log(err));
    if (!file_obj) return send_error_reponse({ message: "Unable to download file from s3" });
    var epg_xml_filename = file_obj.filename,
        channel_id = file_obj.key.split("/")[1].split(".")[0];
    const xmltvData = fs.readFileSync(epg_xml_filename, 'utf-8');
    const result = await xmltvToJsonapi(xmltvData);
    if (!result) return send_error_reponse({ message: "Unable to parse EPG" });
    var schedule = mapToSchedule(JSON.parse(result));

    if (!schedule || schedule.length < 0) {
        return send_error_reponse({ message: "Unable to parse schedule from EPG" });
    }

    var params = {
        TableName: TABLE_NAME,
        Key: {
            "PId": channel_id.trim()
        },
        UpdateExpression: "set schedule = :new_schedule",
        ExpressionAttributeValues: {
            ":new_schedule": schedule
        },
        ReturnValues: "UPDATED_NEW"
    };
    console.log(params);
    var put_data = await put_schedule_data(params).catch((err) => { console.error(err); });
    if (!put_data) return send_error_reponse({ message: "Unable to update schedule for the day" });
    return send_success_reponse({ put_data });
}
