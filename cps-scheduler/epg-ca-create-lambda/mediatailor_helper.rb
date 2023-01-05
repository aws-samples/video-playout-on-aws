require 'aws-sdk-mediatailor'

class MediaTailorHelper 

    def initialize
        #shared_creds = Aws::SharedCredentials.new
        @mt = Aws::MediaTailor::Client.new
    end
    def create_source_location(location_name, location_details)
        resp = @mt.create_source_location({
            http_configuration: {
                base_url: location_details
            },
            source_location_name: location_name,
        })
        resp
    end

    def create_vod_source(source_location, vod_source_path, index)
        resp = @mt.create_vod_source({
            http_package_configurations: [ 
              {
                path: vod_source_path, 
                source_group: "source-group-1", 
                type: "HLS", 
              },
            ],
            source_location_name: source_location, 
            vod_source_name: "src_#{index}", 
        })
        resp
    end

    def create_channel(channel_name)
        resp = @mt.create_channel({
            channel_name: channel_name, 
            outputs: [ 
                {
                    hls_playlist_settings: {
                    manifest_window_seconds: 3600,
                    },
                    manifest_name: "index", 
                    source_group: "source-group-1", 
                },
            ],
            playback_mode: "LOOP"
        })
        put_channel_policy(channel_name)
        resp  
    end

    def put_channel_policy(channel_name)
        policy = "{\n  \"Version\" : \"2012-10-17\",\n  \"Statement\" : [ {\n    \"Sid\" : \"AllowAnonymous\",\n    \"Effect\" : \"Allow\",\n    \"Principal\" : \"*\",\n    \"Action\" : \"mediatailor:GetManifest\",\n    \"Resource\" : \"arn:aws:mediatailor:#{ENV["PROGRAM_DB_REGION"]}:#{ENV["ACCOUNT_ID"]}:channel/#{channel_name}\"\n  } ]\n}"
        resp = @mt.put_channel_policy({
            channel_name: channel_name, # required
            policy: policy, # required
        })
        resp
    end

    def create_program(channel_name, program_details)
        program_details.each_with_index do | program, index |
            cur_index = index + 1
            pre_index = index
            if pre_index == 0 
                resp = @mt.create_program({
                    channel_name: channel_name, # required
                    program_name: "prog_#{cur_index}", # required
                    schedule_configuration: { # required
                        transition: { # required
                            relative_position: "BEFORE_PROGRAM", # required, accepts BEFORE_PROGRAM, AFTER_PROGRAM
                            type: "RELATIVE", # required
                        },
                    },
                    source_location_name: program[:source_location_name],
                    vod_source_name: program[:vod_source_name]
                })
            else
                resp = @mt.create_program({
                    channel_name: channel_name, # required
                    program_name: "prog_#{cur_index}", # required
                    schedule_configuration: { # required
                        transition: { # required
                            relative_position: "AFTER_PROGRAM", # required, accepts BEFORE_PROGRAM, AFTER_PROGRAM
                            relative_program: "prog_#{pre_index}",
                            type: "RELATIVE", # required
                        },
                    },
                    source_location_name: program[:source_location_name],
                    vod_source_name: program[:vod_source_name]
                })
            end

        end
    end

end
