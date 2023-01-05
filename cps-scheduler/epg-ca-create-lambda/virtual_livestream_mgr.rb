require_relative 'xmltv_parser.rb'
require_relative 'mediatailor_helper.rb'
require 'aws-sdk-dynamodb'
require 'net/http'

class VirtualLivestreamMgr    
    def initialize(epg_file, filename)
        @file_name = filename
        @xmltv_parser = XMLTVParser.new epg_file
        #shared_creds = Aws::SharedCredentials.new
        @dynamodb_client = Aws::DynamoDB::Client.new
        @mt_helper = MediaTailorHelper.new
    end

    def process_epg_channel_assembly
        program_details = []
        channel_list = @xmltv_parser.get_all_channels
        channel_list.each do | channel |
            program_list = @xmltv_parser.get_all_programs(channel)
            program_list.each do | program |
                program_details << get_program_source(program)
            end
        
            video_sources = {}
            program_details.each do | program |
                uri = URI.parse(program)
                scheme = uri.scheme
                host = uri.host
                source_location = scheme+"://"+host+"/"
                if video_sources[source_location].nil?
                    video_sources[source_location] = []
                    video_sources[source_location] << uri.path
                else
                    video_sources[source_location] << uri.path
                end
            end
            
            videos = []
            video_sources.keys.each do | source_location |
                uri = URI.parse(source_location)
                source_location_resp = @mt_helper.create_source_location("#{uri.host.gsub('.','_')}_#{@file_name}", source_location)
                video_sources[source_location].each_with_index do | source, index |
                    videos << @mt_helper.create_vod_source(source_location_resp[:source_location_name], source, (index + 1))
                end
            end

            create_channel_resp = @mt_helper.create_channel(channel)
            puts "Channel Create Response => #{create_channel_resp}"

            @mt_helper.create_program(channel, videos)

            puts "Programs provisioned!!, please start the channel to view it"
        end
    end

    def get_program_source(program_id)
=begin
        program_info_resp = @dynamodb_client.get_item({
            key: {
              "program_id" => "#{program_id}", 
              },
            table_name: "program_master",  
        })
        program_info_resp[:item]
=end
        uri = URI("#{ENV["PROGRAM_DB_URL"]}?pid=#{program_id}")
        resp = Net::HTTP.get(uri) 
        url = JSON.parse(resp)["url"]
        url
    end
end
