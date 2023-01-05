require 'json'
require 'virtual_livestream_mgr.rb'
require 'net/http'

def lambda_handler(event:, context:)
    # TODO implement
    puts event 
    epg_file = event["epg_file"]
    uri = URI.parse(epg_file)
    filename = uri.path.split("/").last
    if uri.query.nil?
        path_with_query = uri.path
    else
        path_with_query = "#{uri.path}?#{uri.query}"
    end
    Net::HTTP.start(uri.host) do |http|
        resp = http.get(path_with_query)
        open("/tmp/#{filename}", "wb") do |file|
            file.write(resp.body)
        end
    end
    puts "Done."
    vlive = VirtualLivestreamMgr.new("/tmp/#{filename}", filename.gsub('_','').gsub('.',''))
    vlive.process_epg_channel_assembly
end
