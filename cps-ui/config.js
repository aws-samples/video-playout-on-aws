CONFIG = {
    // ------------------------------------------------- Below values need to be copied from first sam template : cps-backend -------------------------------------------------
    COGNITO_IDENTITY_ID: '{{YOUR_COGNITO_IDENTITY_ID}}',
    USER_POOL_ID: "{{YOUR_USER_POOL_ID}}",
    CLIENT_ID: "{{YOUR_CLIENT_ID}}",
    REGION: "{{YOUR_REGION}}",
    API: "{{YOUR_API}}",
    BUCKET_NAME: "{{YOUR_BUCKET_NAME}}",
    // ------------------------------------------------- Below value should be copied from second sam template : cps-scheduler -------------------------------------------------
    SCHEDULER_API: "{{SCHEDULER_API}}",
    // ------------------------------------------------- Leave below configuration unchanged -------------------------------------------------
    EPG_PATH: "uploaded_epg/",
    ENDPOINTS: {
        API_GET_SCHEDULE: "/schedule?channelid=",
        API_SCHEDULE_PLAYOUT: "/scheduleplayout",
        API_DUPLICATE_EPG: "/copyepg",
        API_UPLOAD_AUTH: "/uploadauth",
        API_START_PLAYOUT: "/start",
        API_GET_ALL_CHANNELS: "/channels",
        API_ADD_CHANNEL: "/channel",
        API_DELETE_SCHEDULE: "/deleteschedule?channelid="
    }
}
