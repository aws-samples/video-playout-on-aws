require "rexml/document"  

class XMLTVParser 

    def initialize(epg_file)
        file = File.new( epg_file ) 
        @doc = REXML::Document.new file  
    end

    def get_all_programs(channel_id)
        program_list = []
        @doc.elements.each('tv/programme') do | element |
            prog_channel_id =  element["channel"]
            if channel_id == prog_channel_id
                element.elements.each("episode-num") do | ep_ele |
                    if ep_ele["system"] == "dd_progid"
                        program_list << ep_ele.text
                    end
                end
            end
        end 
        program_list
    end

    def get_all_channels
        channel_list = []
        @doc.elements.each('tv/channel') do | element |
            channel_list << element["id"]
        end 
        channel_list
    end
end

