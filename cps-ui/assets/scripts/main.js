const API_HOST = CONFIG.API,
    SCHEDULER_API = CONFIG.SCHEDULER_API,
    API_GET_SCHEDULE = CONFIG.ENDPOINTS.API_GET_SCHEDULE,
    API_SCHEDULE_PLAYOUT = CONFIG.ENDPOINTS.API_SCHEDULE_PLAYOUT,
    API_DUPLICATE_EPG = CONFIG.ENDPOINTS.API_DUPLICATE_EPG,
    API_UPLOAD_AUTH = CONFIG.ENDPOINTS.API_UPLOAD_AUTH,
    API_START_PLAYOUT = CONFIG.ENDPOINTS.API_START_PLAYOUT,
    API_GET_ALL_CHANNELS = CONFIG.ENDPOINTS.API_GET_ALL_CHANNELS,
    API_ADD_CHANNEL = CONFIG.ENDPOINTS.API_ADD_CHANNEL,
    API_DELETE_SCHEDULE = CONFIG.ENDPOINTS.API_DELETE_SCHEDULE;

var CHANNELS = [],
    ALERTTYPE = {
        WARNING: 'warning',
        ERROR: 'danger',
        SUCCESS: 'success',
        INFO: 'info'
    },
    player = videojs('cps-videojs-player', {
        cotrols: false
    }),
    alert_html = '<div id="{{ID}}" class="alert my_alert alert-{{TYPE}} alert-dismissible fade show" style=" display:none; position: absolute; top: 0; z-index: 99; float: right; left: 40vw;" role="alert"><strong>{{SUBJECT}}!</strong> {{MESSAGE}}.<button type="button" class="close" data-dismiss="alert" onclick="close_alert()" aria-label="Close"><span aria-hidden="true">&times;</span></button></div>';

function getTableidForDate() {
    return $("#txt_channel_id").val();
}

var makeAjaxCall = function(method, url, data, callback) {
    var headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': getToken()
    }
    $.ajax({
            method,
            url,
            headers,
            data
        })
        .done(function(msg) {
            callback(null, msg);
        }).fail(function(jqXHR, textStatus) {
            callback(textStatus, null);
        });;
}

var makeGetRequest = function(url, callback) {
    makeAjaxCall("GET", url, null, callback);
}

var makePOSTRequest = function(url, body, callback) {
    makeAjaxCall("POST", url, JSON.stringify(body), callback);
}


var getAllChannels = function(callback) {
    var channels_url = API_HOST + API_GET_ALL_CHANNELS;
    makeGetRequest(channels_url, callback);
}

function loginSucessful(username) {
    show_alert(ALERTTYPE.SUCCESS, 'Login Scuccessful', "Fetching channel Details...")
    $('#login-screen').hide();
    $('#main-body').show();
    $('#username').text(username.split('@')[0]);
    $('#welcomespan').show();
    var today = new Date();
    getAllChannels(function(err, data) {
        var channels = data.map(x => x.name);
        fill_autocomplete(channels);
        if (data && data.length > 0) {
            $('#status_nochannel').hide();
            $('.channel_content').show();
            $("#txt_select_channel").val(data[0].name)
            $("#txt_channel_id").val(data[0].PId);
            CHANNELS = data;
            initiateMainPage(data[0].PId);
        }
    })
}


function doLogin(username, password) {
    if (!password) {
        return false;
    }
    aws.auth(username, password, function(authdata) {
        setValue("auth_data", JSON.stringify(authdata));
        setToken(authdata.IdToken);
        var token_json = parseJwt(authdata.AccessToken);
        token_json.email = username;
        setTokenJson(token_json);
        loginSucessful(username);
    })
}

function validateToken() {
    var access_token = getToken();

    if (!access_token)
        return false;

    var access_token_json = getTokenJson(),
        current_time = new Date().getTime(),
        exp = parseInt(access_token_json.exp) * 1000;

    if (current_time > exp)
        return false;

    return true;
}

userLogout = function() {
    localStorage.clear();
    show_alert(ALERTTYPE.SUCCESS, 'Logout Scuccessful', "See you soon!")
    $('#login-screen').show();
    $('#main-body').hide();
}

function setValue(key, data) {
    localStorage.setItem(key, data);
};

function getValue(key) {
    return localStorage.getItem(key);
};

function setToken(value) {
    setValue('access_token', value);
};

function getToken() {
    return getValue('access_token');
};

function setTokenJson(value) {
    setValue('access_token_json', JSON.stringify(value));
};

function getTokenJson() {
    return JSON.parse(getValue('access_token_json'));
};

function getParameterByName(name, url) {
    var character = url.indexOf("?") > 0 ? "?" : '#';
    name = name.replace(/[\[\]]/g, '\\$&');
    var regex = new RegExp(`[${character}&]${name}(=([^&#]*)|&|#|$)`),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

function parseJwt(token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
};

var getschedule = function(channelid, callback) {
    var url = API_HOST + API_GET_SCHEDULE + channelid;
    makeGetRequest(url, callback);
};

var updateschedule = function(channelid, body, callback) {
    var url = API_HOST + API_GET_SCHEDULE + channelid;
    makePOSTRequest(url, body, callback);
};

var deleteschedule = function(channelid, body, callback) {
    var url = API_HOST + API_DELETE_SCHEDULE + channelid;
    makePOSTRequest(url, body, callback);
};

var schedulePlayout = function(body, callback) {
    var url = API_HOST + API_SCHEDULE_PLAYOUT;
    makePOSTRequest(url, body, callback);
};

var startPlayout = function(body, callback) {
    var url = API_HOST + API_START_PLAYOUT;
    makePOSTRequest(url, body, callback);
};

var duplicateEPG = function(body, callback) {
    var url = API_HOST + API_DUPLICATE_EPG;
    makePOSTRequest(url, body, callback);
};

var authneticateuploads = function(callback) {
    var url = API_HOST + API_UPLOAD_AUTH;
    makeGetRequest(url, callback);
};

var hideallscheduledata = function() {
    $('#status_noshedule').hide();
    $('#status_ready').hide();
    $('#status_playing').hide();
    $('#scheduletimeline').hide();
    $('#noschedules').hide()
    $('#status_stopped').hide();
}

var disableScheduleButtons = function(hasNoSchedule) {
    $('#btn_duplicate').prop('disabled', hasNoSchedule)
    $('#btn_delete').prop('disabled', hasNoSchedule)
    $('#btn_ready').prop('disabled', hasNoSchedule)
    $('#btn_stop').hide();
    $('#btn_start').hide();
    $('#btn_copy_url').hide();
}

var fillScheduleDetails = function(data) {
    hideallscheduledata();
    if (data && data.length > 0) {
        data = data[0];
        var schedule = data.schedule;
        if (schedule && schedule.length > 0) {
            constructTimeline(schedule);
            disableScheduleButtons(false);
            if (data.url) {
                $('#btn_ready').hide();
                if (data.channel_status == "STARTED") {
                    $('#btn_stop').show()
                    $('#status_playing').show();
                    $('#btn_start').hide();
                    player.src(data.url);
                    player.play();
                    $('#btn_copy_url').show();
                    $('#btn_copy_url').attr("data-url", data.url);
                }
                else {
                    $('#btn_ready').show();
                    $('#btn_start').show()
                    $('#status_stopped').show();
                    player.pause();
                }
            }
            else {
                $('#status_ready').show();
                $('#btn_ready').show();
                if (data.channel_status == "CREATED") {
                    $('#btn_ready').hide();
                    $('#btn_start').show()
                }
            }
        }
        else {
            $('#noschedules').show()
            disableScheduleButtons(true);
            $('#status_noshedule').show()
        }
    }
    else {
        $('#noschedules').show()
        disableScheduleButtons(true);
        $('#status_noshedule').show()
    }

}

function initiateMainPage(channelid) {
    getschedule(channelid, function(err, data) {
        if (err) return show_alert(ALERTTYPE.ERROR, 'Error', err);
        $("#txt_channel_id").val(channelid);
        show_alert(ALERTTYPE.SUCCESS, 'Schedule Fetched Successfully', "Please proceed.");
        fillScheduleDetails(data);
    });
};

var createDdl = function(start, end, selected) {
    var options = ""
    for (i = start; i < end; i++) {
        options += `<option ${selected==i?"selected":""}>${i<10?"0"+i:i}</option>`;
    }
    return options;
}


var addchannel = function(channel_name, channel_id, callback) {
    var add_channel_url = API_HOST + API_ADD_CHANNEL,
        body = {
            channelid: channel_id,
            channelname: channel_name
        };
    makePOSTRequest(add_channel_url, body, callback)
}

var populateTimeline = function(program_html, program) {
    program_html = program_html.replaceAll("{{DIV_ID}}", program.programid || "default");
    program_html = program_html.replace("{{PROGRAM_ID}}", program.programid || "");
    program_html = program_html.replace("{{EPISODE_NUMBER}}", program.episodenumber || "");
    program_html = program_html.replace("{{TITLE}}", program.title || "");
    program_html = program_html.replace("{{CATEGORY}}", program.category || "");
    program_html = program_html.replace("{{URL}}", program.url || "");
    program_html = program_html.replace("{{TIME_SLOT}}", program.time || "00:00");
    program_html = program_html.replace("{{HOURS}}", program.hours || "00");
    program_html = program_html.replace("{{MINUTES}}", program.minutes || "00");
    program_html = program_html.replace("{{MINUTES_OPTION_LIST}}", createDdl(0, 60, parseInt(program.minutes || "00")));
    program_html = program_html.replace("{{HOURS_OPTION_LIST}}", createDdl(0, 24, parseInt(program.hours || "00")));
    return program_html;
}

var constructTimeline = function(schedule, addnew) {
    $.get("timelineV9.html", function(data) {
        var innerHTML = addnew ? populateTimeline(data, {}) : "";
        if (schedule && schedule.length > 0) {
            schedule.sort((a, b) => {
                return (((parseInt(a.hours) * 60) + parseInt(a.minutes)) - ((parseInt(b.hours) * 60) + parseInt(b.minutes)));
            })
            schedule.forEach(function(program) {
                innerHTML += populateTimeline(data, program)
            });
        }
        $('#mytimeline').html(innerHTML);
        $('.timeline').Timeline();
        $('#scheduletimeline').show();
    });

}

$("#scheduletimeline").on('click', '.delete_schedule', function(e) {
    e.preventDefault();
    var divid = $(this).attr('data-divid');
    var confirmation = confirm("Are you sure you want to delete this program from schedule? This will rest entire schdule");
    if (confirmation) {
        show_alert(ALERTTYPE.INFO, 'Deleting Schedule', "Please wait...");
        var channelid = getTableidForDate();
        var obj_to_delete = get_program_values_from_div(divid);

        if (divid == "default") {
            $('#btn_addprogram').prop('disabled', false);
            return initiateMainPage(channelid);
        }

        $('#btn_addprogram').prop('disabled', false);
        disableScheduleButtons(false);
        deleteschedule(channelid, obj_to_delete, function(err, data) {
            if (err)
                return show_alert(ALERTTYPE.ERROR, 'Unable to delete schedule', err);
            show_alert(ALERTTYPE.SUCCESS, 'Schedule Deleted successfully', "Refresing schedule list..");
            disableScheduleButtons(false);
            $('#btn_addprogram').prop('disabled', false);
            initiateMainPage(channelid);
        });
    }
});

var get_program_values_from_div = function(divid) {
    var dom_obj = document.getElementById('ddl_hours_' + divid);
    var hours = $(dom_obj).val();
    dom_obj = document.getElementById('ddl_minutes_' + divid);
    var minutes = $(dom_obj).val();
    var time = hours + ":" + minutes;
    dom_obj = document.getElementById('txt_programid_' + divid);
    var programid = $(dom_obj).val();
    dom_obj = document.getElementById('txt_episodenumber_' + divid);
    var episodenumber = $(dom_obj).val();
    dom_obj = document.getElementById('txt_title_' + divid);
    var title = $(dom_obj).val();
    dom_obj = document.getElementById('txt_category_' + divid);
    var category = $(dom_obj).val();
    dom_obj = document.getElementById('txt_url_' + divid);
    var url = $(dom_obj).val();
    return {
        hours,
        minutes,
        time,
        programid,
        episodenumber,
        title,
        category,
        url
    }
}

$("#scheduletimeline").on('click', '.save_schedule', function(e) {
    show_alert(ALERTTYPE.INFO, 'Saving Schedule', "Please wait ...");
    e.preventDefault();
    var divid = $(this).attr('data-divid');
    var obj_to_save = get_program_values_from_div(divid);

    if (obj_to_save.programid == "" || !obj_to_save.programid) {
        return show_alert(ALERTTYPE.ERROR, 'Program ID is mandatory', "Please provide program id and save again");
    }
    var channelid = getTableidForDate();
    updateschedule(channelid, obj_to_save, function(err, data) {
        if (err)
            return show_alert(ALERTTYPE.ERROR, 'Unable to save schedule', err);
        show_alert(ALERTTYPE.SUCCESS, 'Schedule saved successfully', "Refresing schedule list..");
        disableScheduleButtons(false);
        $('#btn_addprogram').prop('disabled', false);
        initiateMainPage(channelid);
    })
});


$('.btn_addprogram').click(function(event) {
    $('#btn_addprogram').prop('disabled', true)
    disableScheduleButtons(true);
    var selectedDate = $("#datepicker").datepicker("getDate");
    var channelid = getTableidForDate(selectedDate);
    getschedule(channelid, function(err, data) {
        if (err) return alert(err);
        if (data && data.length > 0 && data[0] && data[0].schedule && data[0].schedule.length > 0)
            constructTimeline(data[0].schedule, true);
        else {
            hideallscheduledata();
            constructTimeline([], true);
            $('#status_noshedule').show();
        }
    });
});



$('#btn_ready').click(function(event) {
    show_alert(ALERTTYPE.INFO, 'Creating Channel', "Please wait ...");
    var channelid = getTableidForDate();
    var body = {
        channelid,
        url: SCHEDULER_API
    }
    schedulePlayout(body, function(err, data) {
        if (err) {
            show_alert(ALERTTYPE.ERROR, 'Unable to schedule Playout', "Ensure all programs has URLs defined");
            console.log(err);
        }
        else {
            show_alert(ALERTTYPE.SUCCESS, 'Playout scheduled successfully', 'Start the channel to begin playout');
            initiateMainPage(channelid);
        }
    })
});

$('#btn_start').click(function(event) {
    show_alert(ALERTTYPE.INFO, 'Starting Channel', "Please wait ...");
    var channelid = getTableidForDate();
    var body = {
        channel_id: channelid,
        url: SCHEDULER_API,
        action: "start"
    }
    startPlayout(body, function(err, data) {
        if (err) {
            show_alert(ALERTTYPE.ERROR, 'Unable to start channel', "Please try after later");
            console.log(err);
        }
        else {
            show_alert(ALERTTYPE.SUCCESS, 'Channel started successfullly', "You could preview your channel in the vidoe player");
            initiateMainPage(channelid);
        }
    })
});

$('#btn_stop').click(function(event) {
    var confirmation = confirm("Are you sure you want to stop this channel? WARNING - This will stop the production channel!!");
    if (confirmation) {
        show_alert(ALERTTYPE.INFO, 'Stopping Channel', "Please wait...");
        var channelid = getTableidForDate();
        var body = {
            channel_id: channelid,
            url: SCHEDULER_API,
            action: "stop"
        }
        startPlayout(body, function(err, data) {
            if (err) {
                show_alert(ALERTTYPE.ERROR, 'Unable to stop channel', "Please try after later");
                console.log(err);
            }
            else {
                show_alert(ALERTTYPE.SUCCESS, 'Channel stopped successfullly', "Please start the channel to begin playout");
                initiateMainPage(channelid);
            }
        })
    }
});

$('#btn_copy_url').click(function(event) {
    var url_text = $('#btn_copy_url').attr("data-url");
    navigator.clipboard.writeText(url_text);
    show_alert(ALERTTYPE.SUCCESS, 'Copied channel url to clipboard', url_text);
});

$('#btn-sign-in').click(function(event) {
    show_alert(ALERTTYPE.INFO, 'Logging in', "Please wait...");
    var username = $('#UserName').val();
    var password = $('#Password').val();
    if (!username || username == ' ' || !password || password == " ") {
        show_alert(ALERTTYPE.ERROR, 'Login Failed', "Please provide username and password")
        return false;
    }
    doLogin(username, password);
});

$('#add-channel').click(function(event) {
    var channel_name = $('#txt_select_channel').val()
    show_alert(ALERTTYPE.WARNING, 'Adding Channel', "processing...")
    if (!channel_name)
        return show_alert(ALERTTYPE.ERROR, 'Error', "Please enter a valide channel name");
    var channel_name_id = channel_name.replaceAll(/\s/g, '');
    var existingChannel = CHANNELS.find(key => key.name.toUpperCase() === channel_name.toUpperCase()) != undefined;
    if (existingChannel) {
        return show_alert(ALERTTYPE.ERROR, 'Channel name exist', "Please select channel from autocomplete list!");
    }
    var channel_id = channel_name_id + "_" + Math.ceil(Math.random() * 1000);
    addchannel(channel_name, channel_id, function(err, data) {
        if (err) {
            return show_alert(ALERTTYPE.ERROR, 'Unable to add channel', "Please try again later!");
        }
        getAllChannels(function(err, data) {
            if (err) {
                return show_alert(ALERTTYPE.ERROR, 'Unable to add channel', "err!");
            }
            show_alert(ALERTTYPE.SUCCESS, 'Channel Added', "Refresing channel list...");
            window.location.reload();
        })
    });
});

var close_alert = function(element) {
    $(element).slideUp('slow', function() {
        $(element).remove();
    });
}

var fill_autocomplete = function(source) {
    $("#txt_select_channel").autocomplete({
        source,
        select: function(e, data) {
            var this_channel = data.item.label,
                channel_id = CHANNELS.filter(channel => channel.name == this_channel)[0].PId;
            show_alert(ALERTTYPE.INFO, 'Fetching details of ' + this_channel, "Please wait...")
            initiateMainPage(channel_id);
        }
    });
}

var show_alert = function(type, subject, message) {
    const divId = Math.ceil((Math.random() * 1000));
    var my_alert = alert_html.replace('{{TYPE}}', type);
    my_alert = my_alert.replace('{{SUBJECT}}', subject);
    my_alert = my_alert.replace('{{ID}}', divId);
    my_alert = my_alert.replace('{{MESSAGE}}', message);
    $('body').append(my_alert);
    $('#' + divId).slideDown();
    setTimeout(function() {
        close_alert('#' + divId);
    }, 2000);
}

$('#btn_upload').click(function(event) {
    $('#epg_upload').click();
});

$('#epg_upload').change(function(event) {
    var fileChooser = document.getElementById('epg_upload');
    var file = fileChooser.files[0];
    var channelid = getTableidForDate();
    if (file) {
        if (file.type != "text/xml") {
            return show_alert(ALERTTYPE.ERROR, 'Invalid File Format', "We support only XMLTV EPG in '.xml' format.")
        }
        var objKey = file.name;
        show_alert(ALERTTYPE.INFO, 'Uploading File - ' + objKey, "Please wait...")
        var params = {
            Key: channelid + '.xml',
            ContentType: file.type,
            Body: file
        };
        aws.upload(params, function(err, data) {
            if (err) {
                show_alert(ALERTTYPE.ERROR, 'Unable to upload file', err)
                console.log(err);
            }
            else {
                show_alert(ALERTTYPE.SUCCESS, 'File uploaded successfullly', "Processing EPG may take couple of minutes...")
                setTimeout(function() {
                    show_alert(ALERTTYPE.INFO, 'Still Proccessing EPG', "Please wait...");
                    setTimeout(function() {
                        initiateMainPage(channelid);
                    }, 8000);
                }, 2100);
            }
        });
    }
    else {
        show_alert(ALERTTYPE.ERROR, 'No file detected', "Please select an EPG in XMLTV format.")
    }
});
