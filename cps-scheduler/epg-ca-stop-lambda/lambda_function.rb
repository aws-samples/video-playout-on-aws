require 'json'
require 'aws-sdk-mediatailor'

def lambda_handler(event:, context:)
    # TODO implement
    puts event["channel_id"]
    channel_id = event["channel_id"]
    client = Aws::MediaTailor::Client.new
    startresp = client.stop_channel({
        channel_name: channel_id
    })
    puts startresp
end
