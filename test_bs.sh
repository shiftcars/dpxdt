#!/bin/bash

#./run_url_pair_diff.sh \
#--upload_build_id=1 \
#--command_executor=http://lindseysimon1:i77w8wZndBmpDXXz1qMe@hub.browserstack.com:80/wd/hub \
#--desired_capabilities='{"browser": "Firefox", "browser_version": "46.0", "os": "OS X", "os_version": "El Capitan", "resolution": "1024x768"}' \
#https://shift.com/cars/san-francisco \
#https://shift.com/cars/san-francisco

./run_diff_my_urls.sh \
    --upload_build_id=1 \
    --upload_release_name="Test release" \
    --release_cut_url=http://whatever \
    --tests_json_path=test.json
